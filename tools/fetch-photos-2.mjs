/**
 * Второй проход загрузки фото: слоты, которые не закрылись с первого раза.
 * Для каждого слота пробуется несколько поисковых формулировок.
 */
import { writeFile, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
const UA = 'MADROCK-coffee-site/1.0 (demo site build)'

const MISSING = [
  { slot: 'frappe',    queries: ['frappe coffee', 'iced coffee glass', 'coffee milkshake'] },
  { slot: 'mulled',    queries: ['mulled wine glass', 'gluhwein mug', 'hot spiced wine'] },
  { slot: 'syrup',     queries: ['flavored syrup bottles', 'coffee syrup dispenser', 'syrup bottle bar'] },
  { slot: 'shawarma',  queries: ['shawarma', 'doner kebab wrap', 'durum kebab'] },
  { slot: 'burger',    queries: ['cheeseburger', 'hamburger', 'burger bun meat'] },
  { slot: 'cheesecake',queries: ['cheesecake slice', 'cheesecake', 'New York cheesecake'] },
  { slot: 'icecream',  queries: ['ice cream scoops', 'ice cream sundae', 'ice cream cone'] },
  { slot: 'eclair',    queries: ['eclair pastry', 'chocolate eclair', 'choux pastry cream'] },
]

async function download(url, file) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 3000) return null
    await writeFile(file, buf)
    return buf.length
  } catch (error) {
    return null
  }
}

async function commons(query) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent(query) +
    '&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const json = await res.json()
    const pages = json && json.query && json.query.pages ? Object.values(json.query.pages) : []
    const found = []
    for (const page of pages) {
      const info = page.imageinfo && page.imageinfo[0]
      if (!info) continue
      const url = info.thumburl || info.url
      if (!url || !/\.(jpe?g|png)/i.test(url)) continue
      const meta = info.extmetadata || {}
      const pick = (k) => (meta[k] && meta[k].value ? String(meta[k].value).replace(/<[^>]*>/g, '') : '')
      found.push({ url, page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title), artist: pick('Artist') || 'не указан', license: pick('LicenseShortName') || 'см. страницу файла' })
    }
    return found
  } catch (error) {
    return null
  }
}

const done = []
for (const m of MISSING) {
  const file = join(out, m.slot + '.jpg')
  let size = null
  let source = null
  for (const q of m.queries) {
    const candidates = await commons(q)
    if (!candidates || candidates.length === 0) continue
    for (const c of candidates) {
      size = await download(c.url, file)
      if (size) { source = c; break }
    }
    if (size) break
  }
  done.push({ slot: m.slot, size, source })
  console.log(`${size ? '✓' : '✗'} ${m.slot.padEnd(12)} ${size ? (size / 1024).toFixed(0) + ' КБ · ' + source.artist : 'не найдено'}`)
}

// дописываем источники в общий файл
try {
  const file = join(out, 'SOURCES.md')
  const prev = await readFile(file, 'utf8')
  const extra = ['', '## Второй проход (поиск по нескольким формулировкам)', '',
    '| Файл | Источник | Лицензия |', '|---|---|---|',
    ...done.map((d) => d.size
      ? `| ${d.slot}.jpg | Wikimedia Commons · ${d.source.artist} ${d.source.page} | ${d.source.license} |`
      : `| ${d.slot}.jpg | не найдено | — |`), '']
  await writeFile(file, prev + extra.join('\n'), 'utf8')
} catch (error) {
  console.log('не удалось дописать SOURCES.md: ' + String(error && error.message))
}

const files = await Promise.all(MISSING.map(async (m) => {
  try { const s = await stat(join(out, m.slot + '.jpg')); return s.size > 3000 } catch (e) { return false }
}))
console.log(`\nитого слотов закрыто: ${files.filter(Boolean).length} из ${MISSING.length}`)
