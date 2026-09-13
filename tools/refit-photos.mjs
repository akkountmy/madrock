/**
 * Скачивание двух фото взамен растянутых.
 *
 * «Фраппе» был 768×1024, «Шаурма» — 510×360: при приведении к 1200×900 их
 * растягивало, отсюда мыло. Берём крупные исходники с Commons (Node умеет
 * ходить в сеть, PowerShell в этой песочнице — нет).
 *
 * Файлы кладутся в assets/_incoming, кадрирование делает refit-crop.ps1.
 * Запуск: node tools/refit-photos.mjs
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const incoming = join(root, 'assets', '_incoming')
await mkdir(incoming, { recursive: true })
const UA = 'MADROCK-coffee-site/1.0 (photo refit)'

const PLAN = [
  { slot: 'frappe', title: 'Frappe (4547117210).jpg' },
  { slot: 'shawarma', title: 'Döner Kebab Wrap - What The Pitta.jpg' },
]

const rows = []
for (const item of PLAN) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|size|extmetadata&iiurlwidth=2000&titles=' + encodeURIComponent('File:' + item.title)
  const res = await fetch(api, { headers: { 'user-agent': UA } })
  const text = await res.text()
  if (!text.trim().startsWith('{')) { console.log('✗ ' + item.slot + ': API недоступен (' + res.status + ')'); continue }
  const page = Object.values(JSON.parse(text).query.pages)[0]
  const info = page.imageinfo && page.imageinfo[0]
  if (!info) { console.log('✗ ' + item.slot + ': файл не найден'); continue }

  const img = await fetch(info.thumburl || info.url, { headers: { 'user-agent': UA } })
  const buf = Buffer.from(await img.arrayBuffer())
  await writeFile(join(incoming, item.slot + '-source.jpg'), buf)

  const meta = info.extmetadata || {}
  const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  rows.push(`| ${item.slot}.jpg | [${item.title}](https://commons.wikimedia.org/wiki/${encodeURIComponent('File:' + item.title)}) | ${clean(meta.Artist && meta.Artist.value) || 'не указан'} | ${clean(meta.LicenseShortName && meta.LicenseShortName.value) || 'см. страницу файла'} |`)
  console.log('✓ ' + item.slot.padEnd(10) + 'исходник ' + info.width + '×' + info.height + ' · ' + Math.round(buf.length / 1024) + ' КБ · ' + item.title.slice(0, 60))
  await new Promise((r) => setTimeout(r, 600))
}

if (rows.length) {
  const block = ['', '## Замена фото с мелких исходников', '',
    '| Файл | Файл-источник | Автор | Лицензия |', '|---|---|---|---|', ...rows, '']
  const prev = await readFile(join(root, 'assets', 'SOURCES.md'), 'utf8').catch(() => '')
  await writeFile(join(root, 'assets', 'SOURCES.md'), prev + block.join('\n'), 'utf8')
  console.log('\nисточники дописаны, файлы ждут кадрирования в assets/_incoming')
}
