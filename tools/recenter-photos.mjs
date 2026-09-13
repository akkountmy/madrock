/**
 * Центрирование товара на фотографиях каталога.
 *
 * Владелец попросил, чтобы сам продукт стоял по центру кадра и занимал у всех
 * позиций примерно одинаковую долю — сейчас на части кадров чашка смещена
 * вбок или вниз, и каталог выглядит неровно.
 *
 * Рамки объектов (доли кадра 0…1) получены моделью зрения по каждому кадру и
 * лежат в таблице ниже — так скрипт воспроизводим без черновой папки.
 * Кадр пересобирается так, чтобы центр объекта совпал с центром кадра, а его
 * высота стала ≈ 70 % кадра. Зум ограничен: объект обязан целиком остаться в
 * кадре (z ≤ 1/размер объекта) и не увеличиваем больше 1,3× — иначе теряется
 * качество и утверждённые кадры портятся.
 *
 * Запуск: node tools/recenter-photos.mjs [--verify]
 */
import { copyFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire('file:///C:/Users/33620/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/')
const sharp = require('sharp')
/* libvips держит исходные файлы открытыми (кеш дескрипторов), а на Windows
   перезапись такого файла падает с UNKNOWN. Отключаем кеш. */
sharp.cache(false)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crops = join(root, 'assets', '_crops')
const out = join(root, 'assets')
const backup = join(root, '.recenter-scratch', 'crops-before')

/* base: [x0, y0, x1, y1, доверие] — рамка главного объекта в долях кадра */
const BOXES = {
  espresso: [0.10, 0.25, 0.96, 0.91, 0.82],
  doppio: [0.455, 0.49, 0.805, 0.87, 0.78],
  americano: [0.07, 0.05, 0.29, 0.44, 0.72],
  cappuccino: [0.42, 0.06, 1.00, 0.84, 0.82],
  big_black: [0.58, 0.18, 0.98, 0.92, 0.78],
  latte: [0.09, 0.03, 0.89, 0.99, 0.72],
  latte_coco: [0.155, 0.035, 0.85, 0.935, 0.72],
  flatwhite: [0.145, 0.12, 0.745, 0.885, 0.78],
  raf: [0.13, 0.47, 0.45, 0.87, 0.78],
  mocha: [0.24, 0.11, 0.74, 0.85, 0.72],
  glace: [0.21, 0.15, 0.78, 0.88, 0.80],
  ice_latte: [0.15, 0.14, 0.42, 0.91, 0.90],
  signature: [0.20, 0.14, 0.89, 0.96, 0.82],
  nutmocha: [0.25, 0.06, 0.79, 1.00, 0.78],
  milkshake: [0.39, 0.045, 0.78, 0.99, 0.72],
  frappe: [0.29, 0.08, 0.87, 1.00, 0.82],
  smoothie: [0.02, 0.32, 0.50, 0.95, 0.78],
  lemonade: [0.31, 0.17, 0.70, 0.90, 0.75],
  icetea: [0.19, 0.13, 0.81, 1.00, 0.86],
  cocoa: [0.09, 0.05, 1.00, 1.00, 0.72],
  hot_choc: [0.11, 0.00, 0.88, 0.85, 0.90],
  teaginger: [0.425, 0.09, 1.00, 0.97, 0.78],
  tea: [0.41, 0.13, 0.77, 0.86, 0.72],
  mulled: [0.10, 0.15, 0.80, 0.85, 0.85],
  sandwich: [0.00, 0.03, 0.99, 1.00, 0.75],
  panini: [0.02, 0.05, 0.99, 0.96, 0.85],
  hotdog: [0.02, 0.08, 0.88, 0.88, 0.90],
  shawarma: [0.27, 0.32, 0.75, 1.00, 0.78],
  burger: [0.03, 0.07, 0.93, 0.95, 0.86],
  cheesecake: [0.04, 0.01, 1.00, 1.00, 0.62],
  croissant: [0.05, 0.07, 0.91, 0.57, 0.72],
}

/* Эти кадры заменены вручную и уже проверены: не трогаем */
const SKIP = new Set(['lavraf', 'icecream', 'eclair'])
/* Ниже этого доверия рамке верить нельзя — кадр остаётся как есть */
const MIN_CONF = 0.6
/* Целевая доля высоты кадра, которую занимает объект */
const TARGET = 0.7
/* Предел увеличения. Сайт публикует варианты 400 и 800 px, поэтому кадр можно
   смелее обрезать: даже зум 1,3 даёт для опубликованных вариантов качество без
   потерь (800 px берётся из кропа 923 px). Мастер 1200×900 при этом мягче, но
   исходники остаются в assets/_original. */
const MAX_ZOOM = 1.3

const W = 1200
const H = 900

/* Рамку объекта расширяем на 15 %: модель зрения очерчивает предмет по видимой
   части и слегка занижает границы, а при зуме это грозило обрезкой края. */
const PAD = 0.15

const pad = (box) => {
  const [x0, y0, x1, y1, conf] = box
  const bw = x1 - x0
  const bh = y1 - y0
  return [
    Math.max(0, x0 - bw * PAD), Math.max(0, y0 - bh * PAD),
    Math.min(1, x1 + bw * PAD), Math.min(1, y1 + bh * PAD), conf,
  ]
}

const plan = (rawBox) => {
  const [x0, y0, x1, y1, conf] = pad(rawBox)
  const bw = x1 - x0
  const bh = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  /* 1. объект обязан целиком остаться в кадре */
  const zFit = Math.min(1 / bw, 1 / bh)
  /* 2. гармоничный размер: объект занимает ~70 % высоты, но не больше 85 %
        кадра — иначе кадр выглядит «слишком крупно» */
  const zAir = 0.85 / Math.max(bw, bh)
  const zTarget = TARGET / bh
  /* 3. центрирование: чтобы центр объекта можно было поставить в центр кадра,
        кадр нужно немного приблизить (левый край не может уйти за пределы) */
  const needX = 1 / (2 * Math.max(0.03, Math.min(cx, 1 - cx)))
  const needY = 1 / (2 * Math.max(0.03, Math.min(cy, 1 - cy)))
  const zCenter = Math.max(needX, needY)
  const z = Math.max(1, Math.min(Math.max(zTarget, zCenter), zFit, zAir, MAX_ZOOM))
  const w = Math.round(W / z)
  const h = Math.round(H / z)
  /* окно ставим так, чтобы центр объекта попал в центр окна, и не вылезаем за кадр */
  let left = Math.round(cx * W - w / 2)
  let top = Math.round(cy * H - h / 2)
  left = Math.max(0, Math.min(W - w, left))
  top = Math.max(0, Math.min(H - h, top))
  return { z, w, h, left, top, before: bh, after: Math.min(1, bh * z), conf }
}

const verifyOnly = process.argv.includes('--verify')

/* Чтоб повторный запуск не обрезал кадр второй раз, помечаем уже
   обработанные файлы: смещения считаются от исходного кадра, а не от нового. */
const appliedFile = join(root, '.recenter-scratch', 'applied.json')
let applied = []
try { applied = JSON.parse(await (await import('node:fs/promises')).readFile(appliedFile, 'utf8')) } catch (e) { applied = [] }
const appliedSet = new Set(applied)

await mkdir(backup, { recursive: true })
const rows = []
let changed = 0

for (const [base, box] of Object.entries(BOXES)) {
  if (SKIP.has(base)) continue
  const src = join(crops, base + '.jpg')
  try { await stat(src) } catch (e) { rows.push([base, 'нет исходного кадра', 0, 0]); continue }
  if (appliedSet.has(base)) { rows.push([base, 'уже пересобран ранее', 0, 0]); continue }
  const p = plan(box)
  const skip = box[4] < MIN_CONF
  const moved = Math.round(Math.abs((p.left + p.w / 2) - W / 2)) + Math.round(Math.abs((p.top + p.h / 2) - H / 2))

  if (!skip && !verifyOnly && (p.z > 1.001 || moved > 8)) {
    await copyFile(src, join(backup, base + '.jpg'))
    const buf = await sharp(src)
      .extract({ left: p.left, top: p.top, width: p.w, height: p.h })
      .resize(W, H, { fit: 'fill' })
      .jpeg({ quality: 90, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
    await writeFile(src, buf)
    for (const [suffix, size, opts] of [
      ['-400.webp', 400, { quality: 72 }],
      ['-800.webp', 800, { quality: 76, effort: 5 }],
      ['-400.jpg', 400, { quality: 76 }],
      ['-800.jpg', 800, { quality: 80 }],
    ]) {
      const img = sharp(buf).resize(size, Math.round(size * H / W))
      const out2 = suffix.endsWith('webp')
        ? img.webp(opts).toFile(join(out, base + suffix))
        : img.jpeg({ ...opts, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' }).toFile(join(out, base + suffix))
      await out2
    }
    changed += 1
    appliedSet.add(base)
    await writeFile(appliedFile, JSON.stringify([...appliedSet], null, 2), 'utf8')
    rows.push([base, 'сдвиг ' + moved + ' px, зум ' + p.z.toFixed(2), p.before, p.after])
  } else {
    rows.push([base, skip ? 'рамка ненадёжна — без изменений' : (moved <= 8 && p.z <= 1.001 ? 'уже по центру и по размеру' : 'проверка'), p.before, p.after])
  }
}

if (verifyOnly) {
  console.log('проверка без правок:')
} else {
  console.log(`пересобрано кадров: ${changed} из ${rows.length}`)
}
console.log('кадр'.padEnd(14) + 'что сделано'.padEnd(34) + 'высота объекта до → после')
for (const [base, what, before, after] of rows) {
  console.log(
    base.padEnd(14) + String(what).padEnd(34) +
    (before ? `${Math.round(before * 100)}%  →  ${Math.round(after * 100)}%` : '—'),
  )
}

const files = (await readdir(out)).filter((f) => /-(400|800)\.(webp|jpg)$/.test(f))
let bytes = 0
for (const f of files) bytes += (await stat(join(out, f))).size
console.log(`\nвариантов в assets/: ${files.length} · ${(bytes / 1024 / 1024).toFixed(2)} МБ`)
console.log(`резервные копии кадров до правки: .recenter-scratch/crops-before/`)
