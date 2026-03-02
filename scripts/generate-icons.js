import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FAVICON_PATH = join(ROOT, 'public', 'favicon.svg');
const ICONS_DIR = join(ROOT, 'public', 'icons');

async function generateIcons() {
  if (!existsSync(FAVICON_PATH)) { console.error('No se encontró public/favicon.svg'); process.exit(1); }
  try {
    const sharp = (await import('sharp')).default;
    const svgBuffer = readFileSync(FAVICON_PATH);
    mkdirSync(ICONS_DIR, { recursive: true });
    for (const size of [192, 512]) {
      await sharp(svgBuffer).resize(size, size).png().toFile(join(ICONS_DIR, `icon-${size}.png`));
      console.log(`Generado: public/icons/icon-${size}.png`);
    }
    console.log('Iconos PWA generados correctamente.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
generateIcons();
