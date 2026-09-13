/**
 * Сверка атрибуции кадров из `assets/SOURCES.md` с метаданными Wikimedia Commons.
 *
 * Для каждой строки таблицы скрипт берёт имя файла-источника (из ссылки на страницу
 * файла, из текста ссылки или из черновика `assets/SOURCES.raw.md`), запрашивает у
 * Commons `extmetadata` (Artist / LicenseShortName / UsageTerms / AttributionRequired)
 * и сравнивает метаданные с тем, что стоит в колонках «Автор» и «Лицензия».
 *
 * Запуск:
 *   node tools/verify-sources.mjs             сверка: расхождения, сводка, итог
 *                                             (код возврата 1, если есть расхождения)
 *   node tools/verify-sources.mjs --json      полный дамп метаданных по кадрам
 *   node tools/verify-sources.mjs --write     заполнить «Автор» и «Лицензия» из метаданных;
 *                                             пишет ТОЛЬКО assets/SOURCES.md и попутно чинит
 *                                             битые ссылки на страницу файла
 *   node tools/verify-sources.mjs --refresh   не читать кэш метаданных, спросить Commons заново
 *
 * Про сеть: анонимные запросы к API Commons жёстко ограничены по частоте, поэтому
 * запросы идут с паузой (MADROCK_API_INTERVAL_MS, по умолчанию 1200 мс), ответы
 * проверяются на «подделку» от ограничителя и повторяются с нарастающей паузой.
 * Полученные метаданные кладутся в кэш в системном TEMP (в репозиторий ничего не
 * пишется); `--refresh` заставляет перезапросить всё заново.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES = join(root, 'assets', 'SOURCES.md')
const RAW = join(root, 'assets', 'SOURCES.raw.md')
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'MADROCK-coffee-site/1.0 (attribution audit of assets/SOURCES.md)'
const CACHE_FILE = join(tmpdir(), 'madrock-commons-extmetadata.json')
const BATCH = 20
const MIN_INTERVAL_MS = Number(process.env.MADROCK_API_INTERVAL_MS || 1200)

const NO_AUTHOR = 'не указан'
const NO_LICENSE = 'см. страницу файла'

/** Лицензии, для которых рядом с работой нужно передавать полный текст лицензии. */
const FULL_TEXT_LICENSES = /GFDL|GNU Free Documentation|Free Art License|FAL 1\.3/i

const args = new Set(process.argv.slice(2))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const cleanCell = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const normTitle = (value) =>
  cleanCell(value).replace(/^file:/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

/* ── разбор таблиц ─────────────────────────────────────────────────────────── */

/** Строки таблиц вида «| Файл | Файл-источник | Автор | Лицензия |». */
function parseRows(text) {
  const rows = []
  text.split(/\r?\n/).forEach((line, index) => {
    if (!/^\s*\|/.test(line)) return
    const cells = line.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
    if (cells.length < 4) return
    if (/^-{2,}$/.test(cells[1].replace(/[:\s]/g, '-'))) return // разделитель шапки
    if (/^файл$/i.test(cells[0])) return // шапка
    if (!/^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(cells[0])) return // не строка кадра
    const link = /\[([\s\S]*?)\]\(([\s\S]*)\)/.exec(cells[1])
    rows.push({
      lineIndex: index,
      file: cells[0],
      base: cells[0].replace(/\.[a-z]+$/i, ''),
      sourceText: link ? cleanCell(link[1]) : '',
      sourceUrl: link ? link[2].trim() : '',
      author: cleanCell(cells[2]),
      license: cleanCell(cells[3]),
    })
  })
  return rows
}

/** Имена файлов-источников, которые можно вытащить из ссылки на страницу файла. */
function candidatesFromUrl(url) {
  const found = []
  let value = String(url || '')
  for (let pass = 0; pass < 4 && value; pass++) {
    const marker = /wikimedia\.org\/wiki\/(File:|File%3A)/i.exec(value)
    const tail = normTitle(safeDecode(marker ? value.slice(marker.index + marker[0].indexOf('File')) : value).replace(/^File:/i, ''))
    if (!tail) break
    found.push(tail)
    // «вложенная» ссылка («Wikimedia Commons · Автор https://…/File%3AИмя.jpg»)
    // прячет настоящий адрес внутри текста — разбираем её следующим проходом
    const nested = /wikimedia\.org/i.exec(tail)
    if (!nested) break
    value = tail.slice(nested.index)
  }
  return found
}

/* ── метаданные Commons ────────────────────────────────────────────────────── */

const cache = new Map()
let cacheHits = 0
let apiCalls = 0
let lastRequestAt = 0

async function loadCache() {
  if (args.has('--refresh')) return
  try {
    const saved = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
    for (const [key, value] of Object.entries(saved.entries || {})) cache.set(key, value)
  } catch {
    // кэша нет — просто спрашиваем сеть
  }
}

async function saveCache() {
  const entries = {}
  for (const [key, value] of cache) entries[key] = value
  try {
    await writeFile(CACHE_FILE, JSON.stringify({ savedAt: new Date().toISOString(), entries }), 'utf8')
  } catch {
    // кэш не критичен
  }
}

/**
 * Один запрос к API с паузой и повторами.
 * Ограничитель частоты Commons умеет отвечать 429, а иногда и «пустым» JSON,
 * в котором имена файлов приходят без префикса File: — такой ответ считается
 * неудачей и повторяется, чтобы «нет данных» нельзя было спутать с «нет файла».
 */
async function apiGet(titles) {
  for (let attempt = 1; ; attempt++) {
    const pause = MIN_INTERVAL_MS - (Date.now() - lastRequestAt)
    if (pause > 0) await sleep(pause)
    lastRequestAt = Date.now()
    apiCalls += 1

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      redirects: '1',
      prop: 'imageinfo',
      iiprop: 'extmetadata',
      titles: titles.map((name) => `File:${name}`).join('|'),
    })

    let res = null
    let body = ''
    let json = null
    try {
      res = await fetch(`${API}?${params}`, { headers: { 'user-agent': UA } })
      body = await res.text()
      json = JSON.parse(body)
    } catch {
      json = null
    }

    const pages = json && json.query && json.query.pages
    const normalized = new Map()
    for (const item of (json && json.query && json.query.normalized) || []) normalized.set(normTitle(item.from).toLowerCase(), item.to)
    for (const item of (json && json.query && json.query.redirects) || []) normalized.set(normTitle(item.from).toLowerCase(), item.to)
    const byTitle = new Map()
    for (const page of Array.isArray(pages) ? pages : []) if (page && page.title) byTitle.set(page.title, page)

    let matched = 0
    const result = new Map()
    for (const wanted of titles) {
      const target = normalized.get(normTitle(wanted).toLowerCase()) || `File:${wanted}`
      const page = byTitle.get(target)
      if (!page) {
        result.set(wanted, null)
        continue
      }
      matched += 1
      if (page.missing) {
        result.set(wanted, null)
        continue
      }
      const info = (page.imageinfo && page.imageinfo[0]) || {}
      const meta = info.extmetadata || {}
      result.set(wanted, {
        title: String(page.title).replace(/^File:/, ''),
        author: cleanCell(meta.Artist && meta.Artist.value),
        license: cleanCell(meta.LicenseShortName && meta.LicenseShortName.value),
        usageTerms: cleanCell(meta.UsageTerms && meta.UsageTerms.value),
        attributionRequired: cleanCell(meta.AttributionRequired && meta.AttributionRequired.value),
      })
    }

    // настоящий ответ API: на каждый запрошенный файл приходит страница (пусть и missing),
    // и у всех страниц пространство File (ns 6). Иначе это ограничитель — повторяем.
    const nsBroken = (Array.isArray(pages) ? pages : []).some((page) => page && page.ns !== 6)
    const ok = Boolean(json) && Array.isArray(pages) && !nsBroken && matched === titles.length && !json.error
    if (ok) return result

    if (attempt > 6) {
      throw new Error(`Commons API не отдал метаданные (попытка ${attempt}): ${body.slice(0, 100).replace(/\s+/g, ' ')}`)
    }
    const retryAfter = Number(res && res.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(15000 * attempt, 60000)
    process.stderr.write(`· Commons ограничил частоту, пауза ${Math.round(wait / 1000)} c\n`)
    await sleep(wait)
  }
}

/** Спросить метаданные про набор имён (с разбивкой на партии и кэшем). */
async function queryTitles(names) {
  const wanted = names.filter((name) => name && !cache.has(name))
  for (const name of names) if (cache.has(name)) cacheHits += 1
  for (let i = 0; i < wanted.length; i += BATCH) {
    const chunk = wanted.slice(i, i + BATCH)
    const got = await apiGet(chunk)
    for (const [key, value] of got) cache.set(key, value)
  }
}

/** Разрешить кандидатов в реальные файлы Commons (у обрезанных ссылок дописываем расширение). */
async function resolveCandidates(candidates) {
  const unique = [...new Set(candidates.filter(Boolean))]
  await queryTitles(unique)

  const guesses = []
  for (const name of unique) {
    if (cache.get(name)) continue
    if (/\.(jpg|jpeg|png|webp|gif|tif|tiff)$/i.test(name)) continue // имя полное, просто такого файла нет
    for (const ext of ['.jpg', '.JPG', '.jpeg', '.png']) guesses.push(`${name}${ext}`)
  }
  const missing = [...new Set(guesses)].filter((name) => !cache.has(name))
  if (missing.length) await queryTitles(missing)
}

/* ── сборка данных по строкам ──────────────────────────────────────────────── */

async function collect() {
  const sources = await readFile(SOURCES, 'utf8')
  const raw = await readFile(RAW, 'utf8').catch(() => '')
  const rawByName = new Map()
  for (const row of parseRows(raw)) if (row.base && row.sourceText) rawByName.set(row.base, row.sourceText)

  const rows = parseRows(sources)
  const plans = rows.map((row) => {
    const candidates = [
      ...candidatesFromUrl(row.sourceUrl),
      normTitle(row.sourceText),
      normTitle(rawByName.get(row.base) || ''),
    ].filter(Boolean)
    return { row, candidates: [...new Set(candidates)] }
  })

  await loadCache()
  await resolveCandidates(plans.flatMap((plan) => plan.candidates))
  await saveCache()

  return plans.map(({ row, candidates }) => {
    const hitName = candidates.find((name) => cache.get(name))
    const meta = hitName ? cache.get(hitName) : null
    const urlTitle = candidatesFromUrl(row.sourceUrl)[0] || ''
    return {
      ...row,
      candidates,
      meta,
      urlTitle,
      linkBroken: Boolean(meta) && normTitle(meta.title).toLowerCase() !== normTitle(urlTitle).toLowerCase(),
      author: meta ? meta.author || NO_AUTHOR : NO_AUTHOR,
      license: meta ? meta.license || NO_LICENSE : NO_LICENSE,
    }
  })
}

/* ── отчёты ────────────────────────────────────────────────────────────────── */

const pad = (value, width) => String(value).padEnd(width)

function report(results) {
  console.log('# Сверка assets/SOURCES.md с метаданными Wikimedia Commons\n')
  console.log(`метаданные: ${cacheHits} записей из кэша, ${apiCalls} запросов к API\n`)

  let badAuthor = 0
  let badLicense = 0
  let unresolved = 0
  const noAuthor = []
  const noLicense = []
  const licenseKinds = new Map()
  const fullText = []

  for (const item of results) {
    const okAuthor = item.author === item.row.author
    const okLicense = item.license === item.row.license
    if (!item.meta) unresolved += 1
    if (!okAuthor) badAuthor += 1
    if (!okLicense) badLicense += 1
    licenseKinds.set(item.license, (licenseKinds.get(item.license) || 0) + 1)
    if (item.license === NO_LICENSE) noLicense.push(item.file)
    if (item.author === NO_AUTHOR) noAuthor.push(item.file)
    if (FULL_TEXT_LICENSES.test(item.license) || (item.meta && FULL_TEXT_LICENSES.test(item.meta.usageTerms))) {
      fullText.push(`${item.file} — ${item.license}${item.meta && item.meta.usageTerms ? ` (${item.meta.usageTerms})` : ''}`)
    }

    const mark = !item.meta ? '??' : okAuthor && okLicense ? 'ok' : '!!'
    console.log(
      `${mark} ${pad(item.file, 16)} ${pad(item.meta ? item.meta.title : '(источник не найден)', 60)} ` +
        `${pad(item.author, 36)} ${item.license}`,
    )
    if (item.meta && (!okAuthor || !okLicense)) {
      console.log(
        `   └ в таблице: «${item.row.author}» / «${item.row.license}»` +
          (item.linkBroken ? ` · ссылка на страницу файла ведёт не туда: «${item.urlTitle}»` : ''),
      )
    }
    if (!item.meta) console.log(`   └ кандидаты: ${item.candidates.map((name) => `«${name}»`).join(', ') || '—'}`)
  }

  console.log('\n## Итог')
  console.log(`строк в таблице: ${results.length}`)
  console.log(`кадров без метаданных Commons: ${unresolved}`)
  console.log(`расхождений по колонке «Автор»: ${badAuthor}`)
  console.log(`расхождений по колонке «Лицензия»: ${badLicense}`)
  console.log(`кадров без автора в метаданных (${noAuthor.length}): ${noAuthor.join(', ') || '—'}`)
  console.log(`кадров без лицензии в метаданных (${noLicense.length}): ${noLicense.join(', ') || '—'}`)

  console.log('\n## Лицензии')
  for (const [kind, count] of [...licenseKinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`${pad(kind, 22)} ${count}`)
  }

  console.log('\n## Требуют передачи полного текста лицензии')
  console.log(fullText.length ? [...new Set(fullText)].map((line) => `- ${line}`).join('\n') : '- нет')

  const counts = new Map()
  for (const item of results) counts.set(item.base, (counts.get(item.base) || 0) + 1)
  const repeated = [...counts].filter(([, count]) => count > 1).map(([base, count]) => `${base} ×${count}`)
  console.log(`\nкадры, встречающиеся в таблице больше одного раза: ${repeated.join(', ') || '—'}`)

  return { badAuthor, badLicense, unresolved }
}

async function checkAssetsCoverage(results) {
  const files = await readdir(join(root, 'assets'))
  const frames = new Set()
  for (const name of files) {
    const match = /^(.+?)-(400|800|1280)\.(webp|jpg)$/i.exec(name)
    if (match) frames.add(match[1])
  }
  const table = new Set(results.map((item) => item.base))
  console.log('\n## Сверка с файлами в assets/')
  console.log(`кадров в assets/: ${frames.size}; кадров со строкой в таблице: ${table.size}`)
  console.log(`кадры без строки в таблице: ${[...frames].filter((base) => !table.has(base)).sort().join(', ') || '—'}`)
  console.log(`строки без файлов в assets/: ${[...table].filter((base) => !frames.has(base)).sort().join(', ') || '—'}`)
}

/* ── запись колонок ────────────────────────────────────────────────────────── */

async function writeColumns(results) {
  const text = await readFile(SOURCES, 'utf8')
  const lines = text.split(/\r?\n/)
  let changed = 0

  for (const item of results) {
    const cells = lines[item.lineIndex].trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
    cells[2] = item.author
    cells[3] = item.license
    if (item.linkBroken && item.meta) {
      // в таблице была обрезанная или чужая ссылка — ставим настоящую страницу файла
      const url = `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${item.meta.title}`)}`
      cells[1] = `[${item.meta.title}](${url})`
    }
    const next = `| ${cells.join(' | ')} |`
    if (next !== lines[item.lineIndex].trim()) {
      lines[item.lineIndex] = next
      changed += 1
    }
  }

  await writeFile(SOURCES, lines.join('\n'), 'utf8')
  console.log(`\nзаписано строк в assets/SOURCES.md: ${changed}`)
}

const results = await collect()

if (args.has('--json')) {
  console.log(JSON.stringify(results.map((item) => ({
    file: item.file,
    source: item.meta ? item.meta.title : null,
    author: item.author,
    license: item.license,
    usageTerms: item.meta ? item.meta.usageTerms : '',
    attributionRequired: item.meta ? item.meta.attributionRequired : '',
  })), null, 2))
} else if (args.has('--write')) {
  await writeColumns(results)
  report(results)
  await checkAssetsCoverage(results)
} else {
  const summary = report(results)
  await checkAssetsCoverage(results)
  const bad = summary.badAuthor + summary.badLicense + summary.unresolved
  if (bad) {
    console.log(`\nрасхождений всего: ${bad}`)
    process.exitCode = 1
  } else {
    console.log('\nтаблица совпадает с метаданными Commons')
  }
}
