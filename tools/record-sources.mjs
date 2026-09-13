/**
 * Восстановление таблицы источников для снимков первого набора.
 *
 * Тот прогон упал на записи файла (не был импортирован readFile), поэтому имена
 * файлов-источников остались только в выводе. Здесь они записываются заново:
 * автор и лицензия запрашиваются у Wikimedia по имени файла.
 *
 * Запуск: node tools/record-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
const UA = 'MADROCK-coffee-site/1.0 (source recording)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** слот → имя файла на Commons (из вывода первого прогона) */
const FILES = {
  hero: 'Interior Johnie\'s Coffee Shop 2021 2.jpg',
  interior: 'Coffee House in Kolkata (Pano) - Interior 03.jpg',
  interior2: 'A table in The Round Table Cafe at Winchester Great Hall 2026-07-12.jpg',
  barista: 'Barista, Portland, Oregon 2.jpg',
  beans: 'Coffee beans roasted.jpg',
  espresso: 'Espresso cup.jpg',
  americano: 'Cinnamon bun and black americano - Waitrose café, Worthing 2026-05-17.jpg',
  cappuccino: 'Cappuccino-cup 20230110 104144.jpg',
  big_black: 'Latte in glass in cincinnati (Unsplash).jpg',
  lemonade: 'Homemade Mint Lemonade,Bangladesh.jpg',
  tea: 'A glass of hibiscus tea 02.jpg',
  croissant: '2018 01 Croissant IMG 0685.JPG',
  sandwich: 'Chicken sandwich and french fries.jpg',
  panini: 'Grilled ham and cheese sandwich.jpg',
}

async function info(title) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|size&titles=' +
    encodeURIComponent('File:' + title)
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const j = await res.json()
    const page = Object.values(j.query.pages)[0]
    const inf = page.imageinfo && page.imageinfo[0]
    const meta = (inf && inf.extmetadata) || {}
    const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    return {
      title: page.title,
      width: inf ? inf.width : 0,
      height: inf ? inf.height : 0,
      author: clean(meta.Artist && meta.Artist.value) || 'не указан',
      license: clean(meta.LicenseShortName && meta.LicenseShortName.value) || 'см. страницу файла',
    }
  } catch (error) {
    return null
  }
}

const rows = []
for (const [slot, title] of Object.entries(FILES)) {
  const m = await info(title)
  await sleep(400)
  const page = 'https://commons.wikimedia.org/wiki/' + encodeURIComponent('File:' + title)
  rows.push(`| ${slot}.jpg | [${title}](${page}) | ${m ? m.author : 'не указан'} | ${m ? m.license : 'см. страницу файла'} |`)
  console.log((m ? '✓' : '?') + ' ' + slot.padEnd(12) + (m ? m.width + '×' + m.height + ' · ' + m.license : 'метаданные недоступны'))
}

const block = ['', '## Первый набор, источники восстановлены', '',
  '| Файл | Файл-источник | Автор | Лицензия |', '|---|---|---|---|', ...rows, '']
const prev = await readFile(join(out, 'SOURCES.md'), 'utf8').catch(() => '')
await writeFile(join(out, 'SOURCES.md'), prev + block.join('\n'), 'utf8')
console.log('\nзаписано источников: ' + rows.length)
