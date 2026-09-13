/**
 * Ручной выбор фото по названию файла на Wikimedia Commons.
 * Используется там, где автоподбор по ключевым словам даёт мусор:
 * заголовок файла виден, поэтому выбор проверяем.
 *
 * Запуск: node tools/pick-photo.mjs
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
await mkdir(out, { recursive: true })
const UA = 'MADROCK-coffee-site/1.0 (manual picking)'

/** слот → выбранное вручную имя файла */
const PICKS = [
  { slot: 'doppio',   title: 'Close-up of espresso machine with two brown coffee cups.jpg' },
  { slot: 'nutmocha', title: 'Gigi Coffee Hazelnut Praline Latte.jpg' },
  { slot: 'lavraf',   title: 'A cup of coffee milk.jpg' },
  { slot: 'orangeesp', title: 'Lloret de Mar - the balcony with coffee and orange (30903803892).jpg' },
  { slot: 'interior3', title: 'Milk and Honey Coffeehouse - May 2026 - Sarah Stierch 02.jpg' },
  { slot: 'interior4', title: 'Cafe Treme interior Feb 2012.jpg' },
]

const rows = []
const only = process.argv.slice(2)
for (const pick of (only.length ? PICKS.filter((x) => only.indexOf(x.slot) >= 0) : PICKS)) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|extmetadata|size&iiurlwidth=1700&titles=' + encodeURIComponent('File:' + pick.title)
  const res = await fetch(api, { headers: { 'user-agent': UA } })
  const raw = await res.text()
  if (!raw.trim().startsWith('{')) { console.log('… лимит запросов, повтор через 20 с'); await new Promise((r) => setTimeout(r, 20000)); continue }
  const j = JSON.parse(raw)
  const page = Object.values(j.query.pages)[0]
  const info = page.imageinfo && page.imageinfo[0]
  if (!info) { console.log('✗ ' + pick.slot + ': файл не найден'); continue }
  const meta = info.extmetadata || {}
  const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const img = await fetch(info.thumburl || info.url, { headers: { 'user-agent': UA } })
  const buf = Buffer.from(await img.arrayBuffer())
  await writeFile(join(out, pick.slot + '.jpg'), buf)
  rows.push(`| ${pick.slot}.jpg | [${pick.title}](https://commons.wikimedia.org/wiki/${encodeURIComponent('File:' + pick.title)}) | ${clean(meta.Artist && meta.Artist.value) || 'не указан'} | ${clean(meta.LicenseShortName && meta.LicenseShortName.value) || 'см. страницу файла'} |`)
  console.log('✓ ' + pick.slot.padEnd(10) + Math.round(buf.length / 1024) + ' КБ · ' + info.width + '×' + info.height + ' · ' + pick.title.slice(0, 70))
  await new Promise((r) => setTimeout(r, 400))
}

const block = ['', '## Выбрано вручную по заголовку файла', '',
  '| Файл | Файл-источник | Автор | Лицензия |', '|---|---|---|---|', ...rows, '']
const prev = await readFile(join(out, 'SOURCES.md'), 'utf8').catch(() => '')
await writeFile(join(out, 'SOURCES.md'), prev + block.join('\n'), 'utf8')
console.log('\nзаписано: ' + rows.length)
