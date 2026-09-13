/* Контрольные листы для проверки моделью зрения: все кадры каталога и пары
   «до/после» по тем, что пересобраны. Запуск: node tools/make-recenter-sheets.mjs */
import { readdir, stat, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire('file:///C:/Users/33620/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/')
const sharp = require('sharp')
sharp.cache(false)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crops = join(root, 'assets', '_crops')
const before = join(root, '.recenter-scratch', 'crops-before')
const scratch = join(root, '.recenter-scratch')
await mkdir(scratch, { recursive: true })

const frames = (await readdir(crops)).filter((f) => /\.jpg$/.test(f)).map((f) => f.replace('.jpg', '')).sort()
const changed = new Set((await readdir(before).catch(() => [])).map((f) => f.replace('.jpg', '')))

/* лист «после»: все кадры, 4 в ряд */
const CW = 300
const CH = 225
const cols = 4
const rows = Math.ceil(frames.length / cols)
const tiles = []
for (let i = 0; i < frames.length; i++) {
  const buf = await sharp(join(crops, frames[i] + '.jpg')).resize(CW, CH, { fit: 'cover' }).toBuffer()
  tiles.push({ input: buf, left: (i % cols) * CW, top: Math.floor(i / cols) * CH })
}
await sharp({ create: { width: cols * CW, height: rows * CH, channels: 3, background: '#111' } })
  .composite(tiles)
  .jpeg({ quality: 82 })
  .toFile(join(scratch, 'sheet-after.jpg'))

/* пары «до → после» только по пересобранным кадрам */
const list = [...changed].sort()
const pairs = []
for (let i = 0; i < list.length; i++) {
  const b = await sharp(join(before, list[i] + '.jpg')).resize(CW, CH, { fit: 'cover' }).toBuffer()
  const a = await sharp(join(crops, list[i] + '.jpg')).resize(CW, CH, { fit: 'cover' }).toBuffer()
  pairs.push({ input: b, left: 0, top: i * CH })
  pairs.push({ input: a, left: CW, top: i * CH })
}
if (list.length) {
  await sharp({ create: { width: CW * 2, height: list.length * CH, channels: 3, background: '#111' } })
    .composite(pairs)
    .jpeg({ quality: 85 })
    .toFile(join(scratch, 'sheet-before-after.jpg'))
}

console.log('кадров всего:', frames.length, '· пересобрано:', list.length)
console.log('порядок кадров на листе «после» (4 в ряд):')
for (let i = 0; i < frames.length; i += cols) {
  console.log('  ' + (i / cols + 1) + ': ' + frames.slice(i, i + cols).join(', '))
}
console.log('порядок пар на листе «до/после» (слева до, справа после):')
list.forEach((b, i) => console.log('  ' + (i + 1) + ': ' + b))
