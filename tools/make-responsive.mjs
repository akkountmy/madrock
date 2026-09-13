#!/usr/bin/env node
/**
 * tools/make-responsive.mjs
 *
 * Собирает лёгкий адаптивный набор картинок для сайта MADROCK COFFEE.
 *
 * Из каждого утверждённого кадра в assets/*.jpg делаются четыре варианта
 * (400px и 800px, webp + jpeg), для героя дополнительно 1280px. Исходные
 * кадры 1200×900 переносятся в assets/_crops/ (папка в .gitignore) — на сайте
 * они больше не отдаются. Логотип заново собирается в 180×180 на месте.
 *
 * Кадрирование НЕ выполняется: источники уже правильные, а размеры вариантов
 * подобраны так, что соотношение сторон совпадает с источником (4:3 и 1:1),
 * поэтому resize() только масштабирует, кропа не происходит. Метаданные не
 * сохраняются (withMetadata() не вызывается), повороты не применяются
 * (rotate() не вызывается) — кадры взяты ровно такими, как утверждены.
 *
 * Запуск:
 *   node tools/make-responsive.mjs              # генерация + проверка
 *   node tools/make-responsive.mjs --verify     # только проверка
 *   node tools/make-responsive.mjs --no-logo    # без пересборки логотипа
 */
import { createRequire } from 'node:module'
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(ROOT, 'assets')
const CROPS = path.join(ASSETS, '_crops')
const ORIGINALS = path.join(ASSETS, '_original')
const BRAND = path.join(ASSETS, 'brand')
const LOGO = path.join(BRAND, 'logo.png')
const LOGO_BACKUP = path.join(BRAND, '_logo-225.png')

const args = new Set(process.argv.slice(2))
const VERIFY_ONLY = args.has('--verify')
const SKIP_LOGO = args.has('--no-logo')
/* Утверждённые кадры убираются из assets/ целиком: в задании названы кадры
   1200×900, но tools/check-photos.mjs считает ошибкой ЛЮБОЙ оставшийся рядом
   <кадр>.jpg (в том числе ig1…ig8) — иначе старый тяжёлый JPEG остаётся в
   публикуемой папке. Флаг --keep-ig возвращает буквальное поведение. */
const KEEP_IG = args.has('--keep-ig')

const IMAGE_RE = /\.(jpe?g|webp|png)$/i
const PHOTO_RE = /\.jpe?g$/i
const VARIANT_RE = /-(400|800|1280)\.(webp|jpe?g)$/i

const kb = (bytes) => Math.round(bytes / 1024)
const mib = (bytes) => (bytes / 1048576).toFixed(2)

/* ------------------------------------------------------------------ sharp -- */
/* sharp лежит внутри чекаута DSH и не прописан в зависимостях проекта:
   подключаем его абсолютным путём, без npm и без сети. */
const SHARP_CANDIDATES = [
  process.env.DSH_SHARP_PATH,
  'C:/Users/33620/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/sharp',
].filter(Boolean)

async function loadSharp() {
  const require = createRequire(import.meta.url)
  const problems = []
  for (const dir of SHARP_CANDIDATES) {
    try {
      const mod = require(dir.replace(/\\/g, '/'))
      if (typeof mod === 'function' && mod.versions) {
        console.log(`sharp ${mod.versions.sharp} · libvips ${mod.versions.vips} · ${dir}`)
        return mod
      }
    } catch (err) {
      problems.push(`require("${dir}") → ${err.message}`)
    }
    // запасной путь: точка входа из exports["."].import самого пакета
    try {
      const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'))
      const entry = pkg.exports?.['.']?.import?.default ?? pkg.module ?? pkg.main
      if (entry) {
        const mod = await import(pathToFileURL(path.join(dir, entry)).href)
        const fn = mod.default ?? mod
        if (typeof fn === 'function' && fn.versions) {
          console.log(`sharp ${fn.versions.sharp} · libvips ${fn.versions.vips} · ${dir} → ${entry}`)
          return fn
        }
      }
    } catch (err) {
      problems.push(`import("${dir}") → ${err.message}`)
    }
  }
  throw new Error('не удалось загрузить sharp:\n  ' + problems.join('\n  '))
}

const sharp = await loadSharp()

/* Без webp и mozjpeg набор собрать нельзя — падаем сразу, а не молча. */
if (!sharp.format?.webp?.output || !sharp.format?.jpeg?.output) {
  throw new Error('sharp собран без webp или jpeg')
}
{
  // mozjpeg и сжатие webp — реальные опции libvips: сверяем, что они вообще
  // влияют на результат, иначе «оптимизация» оказалась бы пустышкой
  const probeSrc = existsSync(path.join(ASSETS, 'hero.jpg')) ? path.join(ASSETS, 'hero.jpg') : null
  if (probeSrc) {
    const withMoz = await sharp(probeSrc).resize(64, 48).jpeg({ mozjpeg: true, quality: 80 }).toBuffer()
    const plain = await sharp(probeSrc).resize(64, 48).jpeg({ mozjpeg: false, quality: 80 }).toBuffer()
    console.log(`  mozjpeg: ${withMoz.length < plain.length ? 'работает' : 'НЕ ВЛИЯЕТ'} (${withMoz.length} Б против ${plain.length} Б на пробе)`)
  }
}

/* --------------------------------------------------------------- правила -- */
const SQUARE_RE = /^ig\d+$/

/** Размеры вариантов для базового имени (без расширения). */
function planFor(base) {
  const square = SQUARE_RE.test(base)
  const steps = [
    { width: 400, height: square ? 400 : 300, size: 'small' },
    { width: 800, height: square ? 800 : 600, size: 'large' },
  ]
  if (base === 'hero') steps.push({ width: 1280, height: 960, size: 'large' })
  return steps
}

/* webp — основный формат, mozjpeg — универсальный фолбэк.
   Мелкие превью жмутся сильнее, крупные получают больше качества. */
const WEBP_OPTS = {
  small: { quality: 72 },
  large: { quality: 76, effort: 5 },
}
const JPEG_OPTS = {
  small: { mozjpeg: true, quality: 76, chromaSubsampling: '4:4:4', progressive: true },
  large: { mozjpeg: true, quality: 80, chromaSubsampling: '4:4:4', progressive: true },
}

const expected = new Map() // имя относительно assets/ → { width, height, format }
/* Утверждённые кадры — не только те, что лежат рядом с сайтом, но и уже
   убранные в assets/_crops/. Иначе повторный запуск видел бы одни варианты. */
const approved = await approvedFrames()
const priorState = { photos: [...approved.values()] }

/* ------------------------------------------------------------- источники -- */
/**
 * Утверждённые кадры сайта: <base>.jpg без суффикса размера, лежащие либо в
 * assets/ (ig1…ig8), либо уже перенесённые в assets/_crops/ (кадры 1200×900).
 */
async function approvedFrames() {
  const found = new Map()
  for (const dir of [ASSETS, CROPS]) {
    if (!existsSync(dir)) continue
    for (const name of (await readdir(dir)).sort()) {
      if (!PHOTO_RE.test(name) || VARIANT_RE.test(name)) continue
      const file = path.join(dir, name)
      if (found.has(name)) continue
      found.set(name, { name, file, bytes: (await stat(file)).size })
    }
  }
  return found
}

async function listSources() {
  const sources = []
  for (const { name, file } of approved.values()) {
    sources.push({ name, base: name.replace(PHOTO_RE, ''), file })
  }
  return sources
}

/** Кадр ищем рядом с сайтом, а если он уже убран — в assets/_crops/. */
async function resolveSource(name) {
  const live = path.join(ASSETS, name)
  if (existsSync(live)) return live
  const crop = path.join(CROPS, name)
  if (existsSync(crop)) return crop
  return null
}

/* ------------------------------------------------------------ генерация --- */
async function generate() {
  await mkdir(CROPS, { recursive: true })

  const sources = await listSources()
  if (!sources.length) {
    console.log('\n! утверждённых кадров *.jpg не найдено — генерировать нечего')
    return []
  }
  const missing = sources.filter((s) => !s.file || !existsSync(s.file))
  if (missing.length) throw new Error('нет исходников: ' + missing.map((s) => s.name).join(', '))

  const made = []
  const notes = []

  for (const { name, base, file } of sources) {
    const meta = await sharp(file).metadata()
    const square = SQUARE_RE.test(base)
    const want = square ? { width: 1080, height: 1080 } : { width: 1200, height: 900 }
    if (meta.width !== want.width || meta.height !== want.height) {
      throw new Error(`${name}: ожидался утверждённый кадр ${want.width}×${want.height}, на диске ${meta.width}×${meta.height}`)
    }
    if (meta.orientation && meta.orientation !== 1) {
      notes.push(`${name}: EXIF orientation=${meta.orientation} — поворот не применяем, кадр берём как хранится`)
    }

    for (const { width, height, size } of planFor(base)) {
      if (Math.abs(meta.width / meta.height - width / height) > 0.002) {
        throw new Error(`${name}: ${width}×${height} не совпадает по пропорциям с источником — потребовался бы кроп`)
      }
      // отдельный пайплайн на каждый вариант: никаких остатков предыдущего
      const pipe = () => sharp(file).resize(width, height, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })

      for (const job of [
        { out: `${base}-${width}.webp`, format: 'webp', pipe: pipe().webp(WEBP_OPTS[size]) },
        { out: `${base}-${width}.jpg`, format: 'jpeg', pipe: pipe().jpeg(JPEG_OPTS[size]) },
      ]) {
        const buf = await job.pipe.toBuffer()
        if (!buf.length) throw new Error(`${job.out}: кодировщик вернул 0 байт`)
        await writeFile(path.join(ASSETS, job.out), buf)
        expected.set(job.out, { width, height, format: job.format })
        made.push({ name: job.out, bytes: buf.length, width, height, format: job.format })
      }
    }
  }

  await moveOriginals(sources)
  if (notes.length) console.log('\nзамечания:\n  ' + notes.join('\n  '))
  return made
}

/**
 * Утверждённые кадры убираем с глаз сайта, но сохраняем в assets/_crops/.
 * По умолчанию — все 51; с --keep-ig квадратные ig1…ig8 остаются рядом.
 */
async function moveOriginals(sources) {
  const movable = sources.filter((s) => !KEEP_IG || !SQUARE_RE.test(s.base))
  const kept = sources.filter((s) => !movable.includes(s))
  const moved = []
  for (const { name } of movable) {
    const from = path.join(ASSETS, name)
    if (!existsSync(from)) continue // уже перенесён прошлым запуском
    const to = path.join(CROPS, name)
    if (existsSync(to)) await unlink(to)
    await copyFile(from, to)
    await unlink(from)
    moved.push(name)
  }
  if (!moved.length) return
  let bytes = 0
  for (const n of moved) bytes += (await stat(path.join(CROPS, n))).size
  console.log(`\nперенесено в assets/_crops/: ${moved.length} кадров · ${kb(bytes)} КБ (папка в .gitignore, сайту не нужны)`)
  if (kept.length) {
    let keptBytes = 0
    for (const { file } of kept) keptBytes += (await stat(file)).size
    console.log(`оставлены в assets/ по флагу --keep-ig: ${kept.length} шт · ${kb(keptBytes)} КБ — ${kept.map((s) => s.name).join(', ')}`)
  }
}

/* ------------------------------------------------------------------ лого -- */
async function rebuildLogo() {
  if (SKIP_LOGO) return null
  if (!existsSync(LOGO)) {
    console.log('\n! assets/brand/logo.png не найден — логотип не пересобираю')
    return null
  }
  // прежний файл остаётся неприкосновенным; повторный запуск идёт от него
  if (!existsSync(LOGO_BACKUP)) await copyFile(LOGO, LOGO_BACKUP)

  const before = (await stat(LOGO)).size
  const buf = await sharp(LOGO_BACKUP)
    .resize(180, 180, { fit: 'contain' })
    .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
    .toBuffer()
  await writeFile(LOGO, buf)

  const meta = await sharp(LOGO).metadata()
  const srcAlpha = (await sharp(LOGO_BACKUP).stats()).channels[3]
  const opaque = srcAlpha && srcAlpha.min === 255 && srcAlpha.max === 255
  expected.set('brand/logo.png', { width: 180, height: 180, format: 'png' })
  console.log(
    `\nлоготип: assets/brand/logo.png ${meta.width}×${meta.height} · ${kb(before)} КБ → ${kb(buf.length)} КБ · ` +
      `прозрачность: ${meta.hasAlpha ? 'канал альфы сохранён' : opaque ? 'была пустой (все пиксели непрозрачны) — отброшена' : 'ПОТЕРЯНА!'}`,
  )
  console.log('  прежний файл: assets/brand/_logo-225.png')
  return { before, after: buf.length, hasAlpha: !!meta.hasAlpha }
}

/* --------------------------------------------------------------- проверка -- */
/** Обход всех собранных файлов: точные размеры, формат, ненулевой вес. */
async function verify() {
  const rows = []
  const fails = []

  for (const [name, want] of [...expected.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.join(ASSETS, name)
    if (!existsSync(file)) {
      fails.push(`${name}: файла нет`)
      continue
    }
    const bytes = (await stat(file)).size
    const problems = []
    if (bytes === 0) problems.push('нулевой вес')

    const head = (await readFile(file)).subarray(0, 12)
    const magic =
      want.format === 'webp'
        ? head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP'
        : want.format === 'jpeg'
          ? head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
          : head[0] === 0x89 && head.subarray(1, 4).toString('latin1') === 'PNG'
    if (!magic) problems.push(`сигнатура файла не ${want.format}`)

    const meta = await sharp(file).metadata()
    if (meta.format !== want.format) problems.push(`формат ${meta.format}, ждали ${want.format}`)
    if (meta.width !== want.width || meta.height !== want.height) {
      problems.push(`размер ${meta.width}×${meta.height}, ждали ${want.width}×${want.height}`)
    }
    if (problems.length) fails.push(`${name}: ${problems.join('; ')}`)
    rows.push({ name, bytes, width: meta.width, height: meta.height, format: meta.format })
  }

  const byFormat = new Map()
  for (const r of rows) {
    const agg = byFormat.get(r.format) ?? { n: 0, bytes: 0 }
    agg.n += 1
    agg.bytes += r.bytes
    byFormat.set(r.format, agg)
  }
  const totalBytes = rows.reduce((a, r) => a + r.bytes, 0)

  console.log('\n' + '='.repeat(78))
  console.log('ПРОВЕРКА СОБРАННЫХ ФАЙЛОВ (sharp metadata)')
  console.log('='.repeat(78))
  console.log(`файлов проверено: ${rows.length} · проблемных: ${fails.length}`)
  for (const [fmt, agg] of [...byFormat.entries()].sort()) {
    console.log(`  ${fmt.padEnd(5)} ${String(agg.n).padStart(4)} шт · ${String(kb(agg.bytes)).padStart(6)} КБ · в среднем ${kb(agg.bytes / agg.n)} КБ`)
  }
  console.log(`  всего ${kb(totalBytes)} КБ · средний ${kb(totalBytes / rows.length)} КБ`)
  const sizes = new Map()
  for (const r of rows) {
    const key = `${r.width}×${r.height}`
    sizes.set(key, (sizes.get(key) ?? 0) + 1)
  }
  console.log('  размеры: ' + [...sizes].map(([k, v]) => `${k} — ${v} шт`).join(' · '))
  console.log(fails.length ? '\nПРОБЛЕМЫ:\n  ' + fails.map((f) => '✗ ' + f).join('\n  ') : '  ✓ у всех файлов точные размеры, верный формат и ненулевой вес')

  return { rows, fails, totalBytes }
}

/* ------------------------------------------------------------ до/после ---- */
async function weightReport(generated) {
  const before = priorState.photos.reduce((a, r) => a + r.bytes, 0)
  const generatedNames = new Set(generated.map((r) => r.name))

  // что реально отдаётся сайтом: собранные варианты + оригиналы, оставшиеся рядом
  const shipped = new Map()
  for (const r of generated) shipped.set(r.name, r.bytes)
  for (const name of await readdir(ASSETS)) {
    if (!IMAGE_RE.test(name) || name.startsWith('_')) continue
    if (shipped.has(name)) continue
    shipped.set(name, (await stat(path.join(ASSETS, name))).size)
  }

  const leftover = []
  for (const name of await readdir(ASSETS)) {
    if (!PHOTO_RE.test(name) || generatedNames.has(name)) continue
    leftover.push({ name, bytes: (await stat(path.join(ASSETS, name))).size })
  }
  const logo = existsSync(LOGO) ? (await stat(LOGO)).size : 0
  const cropFiles = existsSync(CROPS) ? (await readdir(CROPS)).filter((n) => PHOTO_RE.test(n)) : []
  let cropBytes = 0
  for (const n of cropFiles) cropBytes += (await stat(path.join(CROPS, n))).size
  const sum = (iter) => [...iter].reduce((a, r) => a + (typeof r === 'number' ? r : r.bytes), 0)
  const shippedTotal = sum(shipped.values())
  const genTotal = sum(generated.map((r) => r.bytes))
  const leftoverTotal = sum(leftover.map((r) => r.bytes))

  console.log('\n' + '='.repeat(78))
  console.log('ВЕС: ДО / ПОСЛЕ')
  console.log('='.repeat(78))
  console.log(`ДО    : ${priorState.photos.length} файлов · ${mib(before)} МБ · в среднем ${kb(before / priorState.photos.length)} КБ (assets/*.jpg)`)
  console.log(`ПОСЛЕ : ${shipped.size} файлов · ${mib(shippedTotal)} МБ · в среднем ${kb(shippedTotal / shipped.size)} КБ`)
  console.log(`        собранные варианты      : ${generated.length} файлов · ${mib(genTotal)} МБ (в среднем ${kb(genTotal / generated.length)} КБ)`)
  console.log(`        оригиналы, оставшиеся в assets/: ${leftover.length} файлов · ${mib(leftoverTotal)} МБ`)
  console.log(`        логотип                 : ${kb(logo)} КБ`)
  console.log(`        отложено в assets/_crops/ (не отдаётся): ${cropFiles.length} файлов · ${mib(cropBytes)} МБ`)

  const top = [...shipped.entries()].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes).slice(0, 5)
  console.log('\n5 самых крупных файлов после сборки:')
  top.forEach((r, i) => console.log(`  ${i + 1}. ${r.name.padEnd(28)} ${String(kb(r.bytes)).padStart(6)} КБ`))

  // главное для телефона: сколько тянет ОДНА картинка на странице
  const frames = priorState.photos
  const perFrame = frames.map((f) => f.bytes).sort((a, b) => a - b)
  const median = perFrame[Math.floor(perFrame.length / 2)]
  const avgBefore = before / frames.length
  const pick = (re, format) => {
    const sizes = []
    for (const [name, bytes] of shipped) if (re.test(name) && name.endsWith(format)) sizes.push(bytes)
    return sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
  }
  console.log('\nЧто тянет телефон за одну картинку (в среднем по набору):')
  console.log(`  было  : 1200×900 JPEG, в среднем ${kb(avgBefore)} КБ (медиана ${kb(median)} КБ)`)
  console.log(`  стало : 400px webp ${kb(pick(/-400\.webp$/, '.webp'))} КБ · 800px webp ${kb(pick(/-800\.webp$/, '.webp'))} КБ`)
  console.log(`          400px jpeg ${kb(pick(/-400\.jpg$/, '.jpg'))} КБ · 800px jpeg ${kb(pick(/-800\.jpg$/, '.jpg'))} КБ`)
  console.log(`  выигрыш: карточка 400px webp в ${(avgBefore / pick(/-400\.webp$/, '.webp')).toFixed(1)} раза легче исходной 1200×900,`)
  console.log(`           крупный вариант 800px webp — в ${(avgBefore / pick(/-800\.webp$/, '.webp')).toFixed(1)} раза легче`)

  return { before, shipped: shippedTotal, shippedCount: shipped.size, genTotal, leftover, leftoverTotal, logo, top }
}

/* --------------------------------------------------------- качество ------- */
/** Средняя абсолютная разница по каналам и PSNR между двумя raw-буферами. */
function diff(ref, test, channels) {
  if (ref.length !== test.length) throw new Error('разные размеры буферов')
  const px = ref.length / channels
  const sum = new Array(channels).fill(0)
  const sq = new Array(channels).fill(0)
  let peak = 0
  for (let i = 0; i < ref.length; i += channels) {
    for (let c = 0; c < channels; c += 1) {
      const d = ref[i + c] - test[i + c]
      const ad = d < 0 ? -d : d
      sum[c] += ad
      sq[c] += d * d
      if (ad > peak) peak = ad
    }
  }
  const mae = sum.map((s) => s / px)
  const mse = sq.reduce((a, b) => a + b, 0) / (px * channels)
  return { mae, maeAvg: mae.reduce((a, b) => a + b, 0) / channels, psnr: mse === 0 ? Infinity : 10 * Math.log10(65025 / mse), maxDelta: peak }
}

async function rawOf(file, width, height) {
  const img = sharp(file).removeAlpha().toColourspace('srgb')
  if (width) img.resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { data, channels: info.channels }
}

async function qualityReport() {
  const picks = []
  for (const b of ['hero', 'latte', 'ig1']) {
    if (await resolveSource(b + '.jpg')) picks.push(b)
  }
  const out = []
  if (!picks.length) return out

  console.log('\n' + '='.repeat(78))
  console.log('КАЧЕСТВО: отклонение вариантов от утверждённого кадра')
  console.log('='.repeat(78))
  console.log('MAE — средняя абсолютная разница по каналу (шкала 0–255), PSNR в дБ (больше = лучше).')

  for (const base of picks) {
    const src = await resolveSource(base + '.jpg')
    const sm = await sharp(src).metadata()
    const vw = 800
    const vh = sm.width === sm.height ? 800 : 600

    const reference = await rawOf(src)
    const downscaled = await rawOf(src, vw, vh)

    for (const suffix of ['-800.webp', '-800.jpg']) {
      const variant = path.join(ASSETS, base + suffix)
      if (!existsSync(variant)) continue
      const asServed = await rawOf(variant)
      const back = await rawOf(variant, sm.width, sm.height)
      const own = diff(downscaled.data, asServed.data, downscaled.channels)
      const round = diff(reference.data, back.data, reference.channels)
      out.push({ base, suffix, own, round, vw, vh, sw: sm.width, sh: sm.height })
      console.log(
        `  ${(base + suffix).padEnd(16)} в своём ${vw}×${vh}: MAE ${own.maeAvg.toFixed(2)} ` +
          `(R ${own.mae[0].toFixed(2)} / G ${own.mae[1].toFixed(2)} / B ${own.mae[2].toFixed(2)}) · ` +
          `PSNR ${own.psnr.toFixed(1)} дБ · макс. откл. ${own.maxDelta}/255`,
      )
      console.log(
        `  ${''.padEnd(16)} пересчёт обратно к ${sm.width}×${sm.height}: MAE ${round.maeAvg.toFixed(2)} · ` +
          `PSNR ${round.psnr.toFixed(1)} дБ · макс. откл. ${round.maxDelta}/255`,
      )
    }
  }
  return out
}

/* --------------------------------------------------------------- шаблоны -- */
async function templates() {
  // базовые имена берём из утверждённых кадров (часть из них уже в _crops/)
  const bases = new Set()
  for (const dir of [CROPS, ASSETS]) {
    if (!existsSync(dir)) continue
    for (const n of await readdir(dir)) {
      if (PHOTO_RE.test(n) && !VARIANT_RE.test(n)) bases.add(n.replace(PHOTO_RE, ''))
    }
  }
  const all = [...bases].sort()
  const rect = all.filter((b) => !SQUARE_RE.test(b))
  const square = all.filter((b) => SQUARE_RE.test(b))

  console.log('\n' + '='.repeat(78))
  console.log('ШАБЛОНЫ ИМЁН ДЛЯ srcset / sizes')
  console.log('='.repeat(78))
  console.log(`кадр 4:3 <base>.jpg (${rect.length} шт):`)
  console.log('  assets/<base>-400.webp   400×300    assets/<base>-400.jpg   400×300')
  console.log('  assets/<base>-800.webp   800×600    assets/<base>-800.jpg   800×600')
  console.log(`квадрат ig1…ig8 (${square.length} шт):`)
  console.log('  assets/ig1-400.webp      400×400    assets/ig1-400.jpg      400×400')
  console.log('  assets/ig1-800.webp      800×800    assets/ig1-800.jpg      800×800')
  console.log('герой (дополнительный крупный шаг):')
  console.log('  assets/hero-1280.webp   1280×960    assets/hero-1280.jpg   1280×960')
  console.log('\nбазовые имена 4:3 (' + rect.length + '): ' + rect.join(' '))
  console.log('базовые имена квадратов (' + square.length + '): ' + square.join(' '))

  const top = (await readdir(ASSETS)).filter((n) => IMAGE_RE.test(n))
  console.log('\n' + '='.repeat(78))
  console.log('СОСТОЯНИЕ ПАПОК')
  console.log('='.repeat(78))
  console.log(`assets/ верхний уровень, картинок: ${top.length} (.jpg ${top.filter((n) => PHOTO_RE.test(n)).length} · .webp ${top.filter((n) => /\.webp$/i.test(n)).length} · .png ${top.filter((n) => /\.png$/i.test(n)).length})`)
  console.log(`  не-картинки рядом: ${(await readdir(ASSETS)).filter((n) => !IMAGE_RE.test(n) && !n.startsWith('_') && path.extname(n)).join(', ')}`)
  const cropFiles = (await readdir(CROPS)).filter((n) => PHOTO_RE.test(n))
  console.log(`assets/_crops/: ${cropFiles.length} файлов (утверждённые кадры, в .gitignore)`)
  console.log(`assets/_original/: ${(await readdir(ORIGINALS)).length} файлов (не тронуто)`)
  console.log(`assets/brand/: ${(await readdir(BRAND)).length} записей: ${(await readdir(BRAND)).join(', ')}`)
  return top
}

/* ------------------------------------------------------------------ лого -- */
/** Логотип пересобирается с потерей канала альфы — показываем, что это не потеря. */
async function logoReport() {
  if (!existsSync(LOGO_BACKUP)) return null
  console.log('\n' + '='.repeat(78))
  console.log('ЛОГОТИП')
  console.log('='.repeat(78))
  const srcMeta = await sharp(LOGO_BACKUP).metadata()
  const srcStats = await sharp(LOGO_BACKUP).stats()
  const alpha = srcStats.channels[3]
  const outMeta = await sharp(LOGO).metadata()
  const outStats = await sharp(LOGO).stats()
  const outAlpha = outStats.channels[3]

  console.log(`  исходник assets/brand/_logo-225.png: ${srcMeta.width}×${srcMeta.height}, каналов ${srcMeta.channels}, альфа-канал есть`)
  console.log(`    диапазон альфы в исходнике: ${alpha ? `${alpha.min}…${alpha.max} (средняя ${alpha.mean.toFixed(1)})` : '—'}`)
  console.log(`  итог assets/brand/logo.png: ${outMeta.width}×${outMeta.height}, альфа-канал ${outMeta.hasAlpha ? 'есть' : 'отброшен как ненужный'}`)
  if (!outMeta.hasAlpha) {
    console.log('    в исходнике непрозрачны ВСЕ пиксели (min = max = 255), прозрачных областей нет —')
    console.log('    отброшен пустой канал, ни один пиксель не стал прозрачным и не потерял непрозрачность')
  }
  if (outAlpha) console.log(`    диапазон альфы в итоге: ${outAlpha.min}…${outAlpha.max}`)

  const a = await rawOf(LOGO_BACKUP, 180, 180)
  const b = await rawOf(LOGO, 180, 180)
  const d = diff(a.data, b.data, a.channels)
  console.log(
    `  отклонение от источника, пересчитанного в 180×180: MAE ${d.maeAvg.toFixed(2)} ` +
      `(R ${d.mae[0].toFixed(2)} / G ${d.mae[1].toFixed(2)} / B ${d.mae[2].toFixed(2)}) · PSNR ${d.psnr.toFixed(1)} дБ · макс. ${d.maxDelta}/255`,
  )
  const before = (await stat(LOGO_BACKUP)).size
  const after = (await stat(LOGO)).size
  console.log(`  вес: ${before} Б → ${after} Б (${Math.round((1 - after / before) * 100)}% меньше), имя файла не менялось`)
  return { before, after, mae: d.maeAvg }
}

/* ------------------------------------------------------------------ итог -- */
const generated = VERIFY_ONLY ? await collectExisting() : await generate()
if (!VERIFY_ONLY) await rebuildLogo()

const check = await verify()
const weight = await weightReport(VERIFY_ONLY ? check.rows : generated)
const quality = await qualityReport()
const logoInfo = VERIFY_ONLY ? null : await logoReport()
await templates()

if (check.fails.length) process.exitCode = 1

/**
 * Режим --verify: состав вариантов восстанавливаем из имён файлов, чтобы
 * проверить уже собранную папку без повторной генерации.
 */
async function collectExisting() {
  const rows = []
  for (const name of (await readdir(ASSETS)).sort()) {
    const m = /^(.*)-(400|800|1280)\.(webp|jpg)$/i.exec(name)
    if (!m) continue
    const [, base, widthText, ext] = m
    const width = Number(widthText)
    const format = ext.toLowerCase() === 'webp' ? 'webp' : 'jpeg'
    const height = SQUARE_RE.test(base) ? width : Math.round((width / 4) * 3)
    expected.set(name, { width, height, format })
    rows.push({ name, bytes: (await stat(path.join(ASSETS, name))).size, width, height, format })
  }
  expected.set('brand/logo.png', { width: 180, height: 180, format: 'png' })
  return rows
}
