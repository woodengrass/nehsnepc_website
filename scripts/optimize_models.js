import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDirectory = path.join(projectRoot, 'public', 'models', 'src');
const outputDirectory = path.join(projectRoot, 'public', 'models', 'opt');

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule()
  });

await mkdir(outputDirectory, { recursive: true });

const files = fs.existsSync(inputDirectory)
  ? fs.readdirSync(inputDirectory).filter((fileName) => /\.glb$/i.test(fileName))
  : [];

if (files.length === 0) {
  console.log('No .glb files found in public/models/src/ — nothing to do.');
  process.exit(0);
}

for (const fileName of files) {
  const inputPath = path.join(inputDirectory, fileName);
  const outputPath = path.join(outputDirectory, fileName);
  const document = await io.read(inputPath);

  await document.transform(
    dedup(),
    prune(),
    resample(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048] })
  );

  // Draco 壓縮網格；寫出後由 <Model3D> 於文章內互動旋轉。
  document.createExtension(KHRDracoMeshCompression).setRequired(true);
  await io.write(outputPath, document);

  const sourceSize = fs.statSync(inputPath).size;
  const outputSize = fs.statSync(outputPath).size;
  console.log(
    `${fileName}: ${(sourceSize / 1024 / 1024).toFixed(2)}MB -> ${(outputSize / 1024 / 1024).toFixed(2)}MB`
  );
}
