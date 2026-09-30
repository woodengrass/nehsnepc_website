/**
 * Article image pipeline (ADR-0004, editor-managed only).
 *
 * Discovers versioned sources under `assets/articles/` (recursive), rejects
 * traversal/symlinks/unsupported types/over-budget files with warnings
 * (exit 0), and mirrors each source 1:1 to a fallback under
 * `public/images/generated/articles/<rel>` plus width-suffixed AVIF + WebP
 * derivatives beside it, using the hero/satellite Sharp params verbatim
 * (avif q50 effort5 4:4:4 / webp q72 effort6).
 *
 * The fallback is emitted at the exact serialized path Keystatic writes into
 * articles (`/images/generated/articles/<slug>/cover.jpg`,
 * `/images/generated/articles/<slug>/<uuid>-<base>.jpg`, …), so the stored
 * src always resolves; width variants feed manifest-derived srcsets.
 *
 * Only non-upscaled widths from [640, 1280, 1920] are emitted; the fallback
 * is capped at 1920 wide but always emitted (even for sub-640 sources).
 * Measured widths are recorded in the atomic manifest
 * `public/images/generated/articles.manifest.json`, from which `TutorialCover`
 * and `Figure` derive their srcsets. Unchanged sources (mtimeMs + size) are
 * skipped so warm restarts stay instant and committed non-article binaries
 * are never touched. Exit 1 only on Sharp/parse/write failure.
 * Orphan pruning is opt-in via `--prune` (default off).
 *
 * Other families (hero/contact/logo/exposure/satellite) stay owned by
 * `scripts/optimize_images.js` — this script never reads or writes them.
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const SOURCE_ROOT = path.join(ROOT, 'assets', 'articles');
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'generated', 'articles');
const MANIFEST_PATH = path.join(ROOT, 'public', 'images', 'generated', 'articles.manifest.json');

const CANDIDATE_WIDTHS = [640, 1280, 1920];
const FALLBACK_MAX_WIDTH = 1920;
const MAX_BYTES = 8 * 1024 * 1024;

// Lowercase allowlist (input discovery). Everything else — .svg, RAW
// (.raw/.cr2/.cr3/.nef/.arw/.dng/.orf/.rw2), .tif/.tiff/.psd/.heic,
// video (.mp4/.mov/.webm/.avi/.mkv), .glb, etc. — is rejected with a warning.
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const PRUNE = process.argv.includes('--prune');

const summary = { added: 0, updated: 0, skipped: 0, failed: 0 };
const warnings = [];

function warn(message) {
  warnings.push(message);
  console.warn(`[images:articles] WARN ${message}`);
}

function discoverFiles() {
  const found = [];
  if (!fs.existsSync(SOURCE_ROOT)) {
    warn(`source root missing (nothing to do): ${path.relative(ROOT, SOURCE_ROOT)}`);
    return found;
  }
  const rootReal = fs.realpathSync(SOURCE_ROOT);
  const stack = [SOURCE_ROOT];
  while (stack.length > 0) {
    const dir = stack.pop();
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch (error) {
      warn(`unreadable directory ${path.relative(ROOT, dir)}: ${error.message}`);
      continue;
    }
    for (const name of names.sort()) {
      if (name.startsWith('.')) continue; // skip dotfiles
      const abs = path.join(dir, name);
      let st;
      try {
        st = fs.lstatSync(abs);
      } catch (error) {
        warn(`lstat failed ${path.relative(ROOT, abs)}: ${error.message}`);
        continue;
      }
      if (st.isSymbolicLink()) {
        warn(`symlink skipped (never followed): ${path.relative(ROOT, abs)}`);
        continue;
      }
      if (st.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!st.isFile()) continue;
      // Traversal guard: realpath must stay under the source root.
      let real;
      try {
        real = fs.realpathSync(abs);
      } catch (error) {
        warn(`realpath failed ${path.relative(ROOT, abs)}: ${error.message}`);
        continue;
      }
      if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) {
        warn(`traversal escape skipped: ${path.relative(ROOT, abs)}`);
        continue;
      }
      const rel = path.relative(SOURCE_ROOT, abs);
      const ext = path.extname(name).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        warn(`unsupported type skipped: ${rel} (ext ${path.extname(name) || '(none)'})`);
        continue;
      }
      if (st.size === 0) {
        warn(`0-byte file skipped: ${rel}`);
        continue;
      }
      if (st.size > MAX_BYTES) {
        warn(`over 8 MiB budget skipped pre-sharp: ${rel} (${st.size} bytes)`);
        continue;
      }
      if (rel.includes('..')) {
        warn(`unsafe rel skipped: ${rel}`);
        continue;
      }
      found.push({ abs, rel: rel.split(path.sep).join('/'), size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return found.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

function readManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return { version: 1, generatedAt: null, tools: null, items: {} };
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object' || !raw.items || typeof raw.items !== 'object') {
      warn('existing manifest unparsable — regenerating from scratch');
      return { version: 1, generatedAt: null, tools: null, items: {} };
    }
    return { version: 1, generatedAt: null, tools: null, ...raw, items: raw.items };
  } catch (error) {
    warn(`existing manifest unreadable — regenerating: ${error.message}`);
    return { version: 1, generatedAt: null, tools: null, items: {} };
  }
}

function sharpVersion() {
  // sharp's exports map hides ./package.json from resolvers, so walk up from
  // the resolved entry instead (works for npm and pnpm layouts).
  try {
    const req = createRequire(import.meta.url);
    let dir = path.dirname(fs.realpathSync(req.resolve('sharp')));
    for (let i = 0; i < 4; i++) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (pkg && pkg.name === 'sharp' && pkg.version) return pkg.version;
      } catch {}
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return 'unknown';
}

/** Fallback encoder honors the source format (never drops alpha to JPEG). */
function encodeFallback(pipeline, ext) {
  if (ext === '.png') return pipeline.png({ compressionLevel: 9 });
  if (ext === '.webp') return pipeline.webp({ quality: 72, effort: 6, smartSubsample: true, alphaQuality: 100 });
  if (ext === '.avif') return pipeline.avif({ quality: 50, effort: 5, chromaSubsampling: '4:4:4' });
  return pipeline.jpeg({ quality: 82 });
}

async function processFile(entry) {
  const slash = entry.rel.lastIndexOf('/');
  const dir = slash >= 0 ? entry.rel.slice(0, slash) : '';
  const file = slash >= 0 ? entry.rel.slice(slash + 1) : entry.rel;
  const dot = file.lastIndexOf('.');
  const base = dot > 0 ? file.slice(0, dot) : file;
  const ext = (dot > 0 ? file.slice(dot) : '.jpg').toLowerCase();

  let meta;
  try {
    meta = await sharp(entry.abs).metadata();
  } catch (error) {
    throw new Error(`sharp metadata failed for ${entry.rel}: ${error.message}`);
  }
  const intrinsic = meta.width ?? 0;
  if (!Number.isInteger(intrinsic) || intrinsic <= 0) {
    throw new Error(`sharp metadata has no width for ${entry.rel}`);
  }
  // No upscaling for width variants; the fallback is always emitted (capped).
  const widths = CANDIDATE_WIDTHS.filter((w) => w <= intrinsic);
  if (widths.length === 0) {
    warn(`intrinsic width ${intrinsic}px < 640 — variants skipped, fallback only: ${entry.rel}`);
  }
  const outDir = path.join(OUTPUT_DIR, ...dir.split('/').filter(Boolean));
  fs.mkdirSync(outDir, { recursive: true });

  const outputs = [];
  // Fallback at the exact serialized path (same rel as the source).
  const fallbackName = `${base}${ext}`;
  const fallbackWidth = Math.min(intrinsic, FALLBACK_MAX_WIDTH);
  try {
    await encodeFallback(sharp(entry.abs).resize({ width: fallbackWidth, withoutEnlargement: true }), ext).toFile(
      path.join(outDir, fallbackName)
    );
  } catch (error) {
    throw new Error(`sharp fallback failed for ${entry.rel}: ${error.message}`);
  }
  outputs.push(dir ? `${dir}/${fallbackName}` : fallbackName);

  for (const width of widths) {
    const avifName = `${base}-${width}.avif`;
    const webpName = `${base}-${width}.webp`;
    // Hero/satellite params verbatim; fresh pipeline per width (mirrors optimize_images.js).
    const pipeline = () => sharp(entry.abs).resize({ width, withoutEnlargement: true });
    try {
      await Promise.all([
        pipeline()
          .avif({ quality: 50, effort: 5, chromaSubsampling: '4:4:4' })
          .toFile(path.join(outDir, avifName)),
        pipeline()
          .webp({ quality: 72, effort: 6, smartSubsample: true, alphaQuality: 100 })
          .toFile(path.join(outDir, webpName))
      ]);
    } catch (error) {
      throw new Error(`sharp write failed for ${entry.rel} @${width}w: ${error.message}`);
    }
    outputs.push(dir ? `${dir}/${avifName}` : avifName, dir ? `${dir}/${webpName}` : webpName);
  }
  outputs.sort();
  return { widths, fallback: entry.rel, outputs };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest = readManifest();
  const entries = discoverFiles();
  const seen = new Set();

  for (const entry of entries) {
    seen.add(entry.rel);
    const prev = manifest.items[entry.rel];
    if (prev && prev.mtimeMs === entry.mtimeMs && prev.size === entry.size && Array.isArray(prev.widths)) {
      // Skip-unchanged: verify every recorded output still exists (clean-clone
      // safety — gitignored outputs may be missing while the manifest survived).
      const missing = (prev.outputs ?? []).some((name) => !fs.existsSync(path.join(OUTPUT_DIR, ...name.split('/'))));
      if (!missing) {
        summary.skipped += 1;
        continue;
      }
    }
    try {
      const { widths, fallback, outputs } = await processFile(entry);
      const isNew = !prev;
      manifest.items[entry.rel] = { mtimeMs: entry.mtimeMs, size: entry.size, widths, fallback, outputs };
      if (isNew) summary.added += 1;
      else summary.updated += 1;
      console.log(`[images:articles] ${isNew ? 'added' : 'updated'} ${entry.rel} widths=[${widths.join(',')}] fallback=${fallback}`);
    } catch (error) {
      summary.failed += 1;
      console.error(`[images:articles] ERROR ${error.message}`);
    }
  }

  if (PRUNE) {
    for (const rel of Object.keys(manifest.items)) {
      if (seen.has(rel)) continue;
      const item = manifest.items[rel];
      for (const name of item.outputs ?? []) {
        try {
          fs.rmSync(path.join(OUTPUT_DIR, ...name.split('/')), { force: true });
        } catch (error) {
          warn(`prune unlink failed ${name}: ${error.message}`);
        }
      }
      // Best-effort: drop the now-empty source-mirrored directory.
      const slash = rel.lastIndexOf('/');
      if (slash > 0) {
        try {
          const dirAbs = path.join(OUTPUT_DIR, ...rel.slice(0, slash).split('/'));
          if (fs.existsSync(dirAbs) && fs.readdirSync(dirAbs).length === 0) fs.rmdirSync(dirAbs);
        } catch {}
      }
      delete manifest.items[rel];
      console.log(`[images:articles] pruned orphan ${rel}`);
    }
  }

  manifest.version = 1;
  manifest.generatedAt = new Date().toISOString();
  manifest.tools = { sharp: sharpVersion(), node: process.version };
  const tmp = `${MANIFEST_PATH}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, MANIFEST_PATH);
  } catch (error) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
    console.error(`[images:articles] ERROR atomic manifest write failed: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `[images:articles] done added=${summary.added} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed} warnings=${warnings.length}`
  );
  if (summary.failed > 0) process.exit(1);
}

const invokedAsScript =
  typeof process.argv[1] === 'string' && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  await main();
}
