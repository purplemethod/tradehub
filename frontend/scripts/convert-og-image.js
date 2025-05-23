import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/og-image.svg'));
sharp(svgBuffer)
  .png()
  .toFile(path.join(__dirname, '../public/og-image.png'))
  .then(() => {
    console.log('Successfully converted SVG to PNG');
  })
  .catch(err => {
    console.error('Error converting SVG to PNG:', err);
  }); 