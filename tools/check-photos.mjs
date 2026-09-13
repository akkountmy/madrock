/**
 * Проверка файлов фото: формат, ожидаемые размеры, вес и полнота набора.
 *
 * Каждый кадр лежит в четырёх файлах: ширина 400 и 800 px в WebP и JPEG
 * (у главного фото ещё 1280) — из них браузер выбирает нужный под экран.
 * Проверка следит за тем, что легко испортить при обновлении фото:
 *   1. имя файла соответствует его настоящему размеру и формату;
 *   2. набор вариантов собран полностью — иначе на части экранов будет дырка;
 *   3. вес каждого файла укладывается в бюджет, иначе страница снова начнёт
 *      «жевать» мегабайты. Итоговые суммы показывают, во сколько обходится
 *      полный обход сайта на телефоне и на большом экране.
 *
 * Запуск: node tools/check-photos.mjs
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'assets')

/* Бюджеты веса: вариант 400 — это телефон, 800 — планшет и десктоп,
   1280 — только главное фото на широком экране. */
const BUDGET = { 400: 60 * 1024, 800: 150 * 1024, 1280: 320 * 1024 }
const TOTAL_BUDGET = 9 * 1024 * 1024

const files = [
  ...(await readdir(dir)).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f)),
  ...(await readdir(join(dir, 'brand')).catch(() => []))
    .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f) && !f.startsWith('_') && !/^candidate-|^logo-source/.test(f))
    .map((f) => 'brand/' + f),
].sort()

const jpegSize = (buf) => {
  let i = 2
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue }
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return { w: 0, h: 0 }
}

const webpSize = (buf) => {
  const tag = buf.toString('latin1', 12, 16)
  if (tag === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (tag === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (tag === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 }
  return { w: 0, h: 0 }
}

const rows = []
for (const name of files) {
  const buf = await readFile(join(dir, name))
  let format = 'другое'
  let size = { w: 0, h: 0 }
  let alpha = false

  if (buf[0] === 0xff && buf[1] === 0xd8) { format = 'JPEG'; size = jpegSize(buf) }
  else if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') { format = 'WebP'; size = webpSize(buf) }
  else if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') {
    format = 'PNG'
    size = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
    const colorType = buf[25]
    alpha = colorType === 4 || colorType === 6 || (colorType === 3 && buf.includes(Buffer.from('tRNS')))
  }

  const m = name.match(/^([a-z0-9_]+)-(\d+)\.(webp|jpg)$/)
  rows.push({
    name,
    format,
    w: size.w,
    h: size.h,
    alpha,
    bytes: buf.length,
    kb: Math.round(buf.length / 1024),
    base: m ? m[1] : null,
    label: m ? Number(m[2]) : null,
    ext: m ? m[3] : null,
  })
}

const bad = []

/* --- 1. имя, формат и настоящий размер ---------------------------------- */
for (const r of rows) {
  if (!r.base) {
    /* в assets/brand/ живут только знак бренда и обложка для превью ссылки */
    if (['brand/logo.png', 'brand/og-cover.jpg'].indexOf(r.name) < 0) bad.push(r.name + ' — неожиданное имя (ждём <кадр>-400/800/1280.webp|jpg)')
    continue
  }
  if (r.name.startsWith('brand/')) { bad.push(r.name + ' — в assets/brand/ остаётся только logo.png'); continue }
  if (r.format === 'другое') { bad.push(r.name + ' — не картинка'); continue }
  if (r.ext === 'webp' && r.format !== 'WebP') bad.push(r.name + ' — внутри ' + r.format + ', а не WebP')
  if (r.ext === 'jpg' && r.format !== 'JPEG') bad.push(r.name + ' — внутри ' + r.format + ', а не JPEG')
  if (![400, 800, 1280].includes(r.label)) bad.push(r.name + ' — вариант ширины ' + r.label + ' не предусмотрен')
  if (r.w !== r.label) bad.push(r.name + ' — ширина картинки ' + r.w + ' вместо ' + r.label)
  const square = /^ig\d$/.test(r.base)
  const want = square ? r.label : r.label * 3 / 4
  if (r.h && r.h !== want) bad.push(r.name + ' — высота ' + r.h + ' вместо ' + want + (square ? ' (квадрат)' : ' (4:3)'))
}

/* --- 2. полнота набора вариантов ---------------------------------------- */
const bases = new Map()
for (const r of rows) {
  if (!r.base || r.name.startsWith('brand/')) continue
  if (!bases.has(r.base)) bases.set(r.base, new Set())
  bases.get(r.base).add(r.ext + '-' + r.label)
}
const incomplete = []
for (const [base, set] of bases) {
  for (const ext of ['webp', 'jpg']) {
    for (const label of base === 'hero' ? [400, 800, 1280] : [400, 800]) {
      if (!set.has(ext + '-' + label)) incomplete.push(base + '-' + label + '.' + ext)
    }
  }
}
if (incomplete.length) {
  bad.push('неполные наборы: ' + incomplete.slice(0, 8).join(', ') + (incomplete.length > 8 ? ' и ещё ' + (incomplete.length - 8) : ''))
}

/* --- 3. вес ------------------------------------------------------------- */
const variants = rows.filter((r) => r.base && !r.name.startsWith('brand/'))
const over = variants.filter((r) => r.bytes > BUDGET[r.label]).map((r) => r.name + ' (' + r.kb + ' КБ)')
const total = rows.reduce((s, r) => s + r.bytes, 0)
const sum = (pick) => variants.filter(pick)
const pick = (label, ext) => sum((r) => r.label === label && r.ext === ext)
const mobile = pick(400, 'webp')
const big = [...pick(800, 'webp'), ...pick(1280, 'webp')]
const kb = (list) => Math.round(list.reduce((s, r) => s + r.bytes, 0) / 1024)
const worst = rows.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 5)

console.log('кадров: ' + bases.size + ' · файлов: ' + rows.length + ' · всего на диске ' + (total / 1024 / 1024).toFixed(2) + ' МБ')
console.log('телефон (вариант 400, WebP): ' + mobile.length + ' файлов · ' + kb(mobile) + ' КБ за полный обход страницы')
console.log('большой экран (800/1280, WebP): ' + big.length + ' файлов · ' + kb(big) + ' КБ за полный обход страницы')
console.log('самые крупные: ' + worst.map((r) => r.name + ' ' + r.kb + ' КБ').join(' · '))

const logo = rows.find((r) => r.name === 'brand/logo.png')
if (!logo) bad.push('нет assets/brand/logo.png')
else {
  /* Прозрачность у логотипа не требуется: знак лежит на светлой подложке
     (см. .logo__img в styles.css), и в исходном файле альфа-канал был
     полностью непрозрачным. Проверяем только размер и вес. */
  if (logo.format !== 'PNG') bad.push('логотип не PNG')
  if (logo.w > 200 || logo.h > 200) bad.push('логотип крупнее 200 px (' + logo.w + '×' + logo.h + ')')
  if (logo.bytes > 40 * 1024) bad.push('логотип тяжелее 40 КБ (' + logo.kb + ' КБ)')
  console.log('логотип: ' + logo.w + '×' + logo.h + ' · ' + logo.kb + ' КБ · ' + logo.format)
}

const stale = rows.filter((r) => /^[a-z0-9_]+\.jpe?g$/i.test(r.name)).map((r) => r.name)
if (stale.length) bad.push('остались старые JPEG без вариантов: ' + stale.join(', '))
if (over.length) bad.push('тяжелее бюджета: ' + over.join(', '))
if (total > TOTAL_BUDGET) bad.push('суммарно тяжелее ' + (TOTAL_BUDGET / 1024 / 1024).toFixed(1) + ' МБ')

if (bad.length) {
  console.log('\nОШИБКИ:')
  bad.forEach((b) => console.log('  ✗ ' + b))
  process.exitCode = 1
} else {
  console.log('\nвсе фото на месте, в нужных размерах и в бюджете по весу')
}
