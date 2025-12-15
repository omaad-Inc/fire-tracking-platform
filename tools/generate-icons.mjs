import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const srcSvg = path.join(root, 'src/assets/afrin-nexus-logo.svg');
const outDir = path.join(root, 'public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  if (!fs.existsSync(srcSvg)) {
    console.error(`Source SVG not found: ${srcSvg}`);
    process.exit(1);
  }
  await ensureDir(outDir);
  const svgBuffer = await fs.promises.readFile(srcSvg);
  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer, { density: 512 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Generated ${path.relative(root, outPath)}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});


