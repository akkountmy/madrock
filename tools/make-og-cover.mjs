/* Обложка для превью ссылки в мессенджерах: 1200×630 из главного кадра.
   Запуск: node tools/make-og-cover.mjs */
import { createRequire } from 'node:module'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire('file:///C:/Users/33620/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/')
const sharp = require('sharp')

const out = join(root, 'assets', 'brand', 'og-cover.jpg')
const info = await sharp(join(root, 'assets', '_crops', 'hero.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
  .toFile(out)

console.log(`обложка: assets/brand/og-cover.jpg — ${info.width}×${info.height}, ${Math.round((await stat(out)).size / 1024)} КБ`)
