import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'public', 'images', 'generated');

const imageSets = [
  {
    name: 'hero',
    source: path.join(projectRoot, 'public', 'images', 'banner', 'hero-1.jpg'),
    widths: [640, 1280, 1920, 2560],
    avifQuality: 50,
    webpQuality: 72
  },
  {
    name: 'contact',
    source: path.join(projectRoot, 'public', 'images', 'contact-bg.jpg'),
    widths: [480, 800, 1200, 1600],
    avifQuality: 50,
    webpQuality: 74
  },
  {
    name: 'logo',
    source: path.join(projectRoot, 'public', 'images', 'logo.png'),
    widths: [96, 192, 384],
    avifQuality: 58,
    webpQuality: 82
  },
  {
    name: 'exposure-calculator',
    source: path.join(projectRoot, 'public', 'images', 'exposure-calculator.png'),
    widths: [640],
    avifQuality: 52,
    webpQuality: 76
  }
];

await mkdir(outputDirectory, { recursive: true });

for (const imageSet of imageSets) {
  for (const width of imageSet.widths) {
    const resizedImage = sharp(imageSet.source).resize({ width, withoutEnlargement: true });
    await Promise.all([
      resizedImage
        .clone()
        .avif({ quality: imageSet.avifQuality, effort: 5, chromaSubsampling: '4:4:4' })
        .toFile(path.join(outputDirectory, `${imageSet.name}-${width}.avif`)),
      resizedImage
        .clone()
        .webp({ quality: imageSet.webpQuality, effort: 6, smartSubsample: true, alphaQuality: 100 })
        .toFile(path.join(outputDirectory, `${imageSet.name}-${width}.webp`))
    ]);
  }
}
