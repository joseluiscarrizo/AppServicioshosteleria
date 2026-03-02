/**
 * Genera iconos PNG para PWA a partir del favicon SVG.
 * Uso: node scripts/generate-icons.js
 * Requiere: npm install sharp -D
 */
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;
    const svgBuffer = readFileSync(join(__dirname, '../public/favicon.svg'));

    mkdirSync(join(__dirname, '../public/icons'), { recursive: true });

    const sizes = [192, 512];
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(__dirname, `../public/icons/icon-${size}.png`));
      console.log(`✅ Generado: icon-${size}.png`);
    }

    console.log('🎉 Iconos PWA generados correctamente en public/icons/');
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('sharp')) {
      console.error('❌ Instala sharp primero: npm install sharp -D');
    } else {
      console.error('❌ Error:', e.message);
    }
    process.exit(1);
  }
}

generateIcons();
