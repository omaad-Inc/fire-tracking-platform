import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outDir = path.join(root, 'public/icons');

// Source files (in order of preference)
const sourcePng = path.join(root, 'public/icons/source-logo.png');
const sourceSvg = path.join(root, 'src/assets/afrin-nexus-logo.svg');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  let sourceFile;
  let isPng = false;

  // Check for PNG source first, then SVG
  if (fs.existsSync(sourcePng)) {
    sourceFile = sourcePng;
    isPng = true;
    console.log(`Using PNG source: ${sourcePng}`);
  } else if (fs.existsSync(sourceSvg)) {
    sourceFile = sourceSvg;
    console.log(`Using SVG source: ${sourceSvg}`);
  } else {
    console.error(`No source file found. Please provide one of:`);
    console.error(`  - ${sourcePng}`);
    console.error(`  - ${sourceSvg}`);
    process.exit(1);
  }

  await ensureDir(outDir);
  const sourceBuffer = await fs.promises.readFile(sourceFile);

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}x${size}.png`);
    
    const sharpInstance = isPng 
      ? sharp(sourceBuffer)
      : sharp(sourceBuffer, { density: 512 });

    await sharpInstance
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } }) // #0f172a dark background
      .png()
      .toFile(outPath);
    
    console.log(`Generated ${path.relative(root, outPath)}`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
