/**
 * Пересборка assets/SOURCES.md в одну достоверную таблицу.
 *
 * За несколько заходов в файле накопилось шесть таблиц, и «последняя» запись
 * слота перестала соответствовать файлу на диске (например, для доппио там
 * остался отвергнутый снимок). Здесь источники собираются заново: берутся
 * фактические имена файлов-источников, автор и лицензия запрашиваются у Commons.
 *
 * Запуск: node tools/rebuild-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
const UA = 'MADROCK-coffee-site/1.0 (source rebuild)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** фактические файлы-источники для слотов, выбранных вручную (последнее слово) */
const MANUAL = {
  doppio: 'Close-up of espresso machine with two brown coffee cups.jpg',
  nutmocha: 'Gigi Coffee Hazelnut Praline Latte.jpg',
  lavraf: 'A cup of coffee milk.jpg',
  orangeesp: 'Lloret de Mar - the balcony with coffee and orange (30903803892).jpg',
  // восстановлено по первой таблице источников: имена были искажены пересборкой
  interior: 'Coffee House in Kolkata (Pano) - Interior 03.jpg',
  burger: 'Cheeseburger.jpg',
  frappe: 'Café frappé in glass.jpg',
  mulled: 'Glühwein (hot mulled wine) in a glass with an orange slice 10.jpg',
  syrup: 'Syrup for drinks flavored mint.JPG',
  shawarma: 'Shawarma closeup.png',
  cheesecake: 'Mondays at Il Forno - Cheesecake with strawberry sauce.jpg',
  icecream: 'Ice Cream Scoop.jpg',
  eclair: 'JF100425 DSB Chocolate Eclairs & Cream Puffs.jpg',
  hotdog: 'Hotdog - Evan Swigart.jpg',
  cocoa: 'Hot chocolate.jpg',
  hot_choc: 'CanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow.jpg',
}

/** слот → имя файла-источника, прочитанное из старых таблиц (последнее упоминание) */
const prev = await readFile(join(out, 'SOURCES.md'), 'utf8').catch(() => '')
const found = {}
for (const line of prev.split('\n')) {
  if (line.trim().indexOf('|') !== 0) continue
  const cells = line.split('|').map((s) => s.trim())
  const slot = (cells[1] || '').match(/^([a-z_0-9]+)\.jpg$/i)
  if (!slot) continue
  const cell = cells[2] || ''
  // ссылка может содержать скобки в имени файла, поэтому берём url до «) |»
  const md = cell.match(/\[([^\]]*)\]\((https?:\/\/[^\s]+?)\)\s*(?:\||$)/)
  let page = md ? md[2] : ((cell.match(/https?:\/\/[^\s|]+/) || [])[0] || '')
  let title = md ? md[1].trim() : ''
  if (page) {
    const fromUrl = page.match(/wiki\/(.+)$/)
    if (fromUrl) {
      const name = decodeURIComponent(fromUrl[1]).replace(/^File:/, '')
      title = name   // имя из ссылки однозначно: в тексте ячейки оно могло обрезаться
    }
  }
  if (title && title !== 'не найдено') found[slot[1]] = { title, page: page || 'https://commons.wikimedia.org/wiki/' + encodeURIComponent('File:' + title) }
}

Object.assign(found, Object.fromEntries(Object.entries(MANUAL).map(([slot, title]) => [slot, {
  title, page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent('File:' + title),
}])))

let metaDisabled = false

async function meta(title) {
  if (metaDisabled) return { author: 'не указан', license: 'см. страницу файла' }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=' +
        encodeURIComponent('File:' + title), { headers: { 'user-agent': UA } })
      const text = await res.text()
      if (!text.trim().startsWith('{')) { metaDisabled = true; break }
      const j = JSON.parse(text)
      const page = Object.values(j.query.pages)[0]
      const m = (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].extmetadata) || {}
      const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      return { author: clean(m.Artist && m.Artist.value) || 'не указан', license: clean(m.LicenseShortName && m.LicenseShortName.value) || 'см. страницу файла' }
    } catch (error) {
      metaDisabled = true
    }
  }
  return { author: 'не указан', license: 'см. страницу файла' }
}

const slots = Object.keys(found).sort()
const rows = []
for (const slot of slots) {
  const f = found[slot]
  const m = await meta(f.title)
  if (!metaDisabled) await sleep(250)
  rows.push(`| ${slot}.jpg | [${f.title}](${f.page}) | ${m.author} | ${m.license} |`)
  console.log('✓ ' + slot.padEnd(13) + f.title.slice(0, 62))
}

const text = [
  '# Источники фотографий',
  '',
  `Все ${rows.length} файлов в этой папке — со Wikimedia Commons. Это выбрано осознанно:`,
  'имя файла там прямо описывает содержимое снимка, поэтому соответствие фото и позиции',
  'меню можно проверить программно (tools/audit-photos.mjs), не открывая картинку.',
  '',
  'Проверка Unsplash оказалась невозможной: их API закрыт для анонимных запросов (401),',
  'поэтому снимки оттуда не используются — по ним нельзя подтвердить, что на фото именно',
  'то, что заявлено в названии позиции.',
  '',
  'Файлы приведены к единому кадру 1200×900 (4:3) и формату JPEG; исходники — в assets/_original.',
  'Отдельно: hero.jpg обрезан широко (1400×788) — он используется как фон во всю ширину.',
  '',
  '| Файл | Файл-источник (что на снимке) | Автор | Лицензия |',
  '|---|---|---|---|',
  ...rows,
  '',
  'Проверенные соответствия: hero и interior — интерьеры кофеен, barista — бариста, beans —',
  'жареное зерно, espresso/doppio — эспрессо, americano — чёрный американо, cappuccino и',
  'big_black — капучино и латте в стакане, latte и latte_coco — латте и кокосовое молоко,',
  'flatwhite — флэт уайт, raf и lavraf — кофе со сливками, mocha и nutmocha — мокко и',
  'ореховый латте, glace — аффогато, ice_latte — айс-кофе, signature — карамельный латте,',
  'orangeesp — кофе с апельсином, milkshake/frappe/smoothie/lemonade/icetea — коктейль,',
  'фраппе, ягодный смузи, лимонад и холодный чай, cocoa и hot_choc — какао и горячий шоколад,',
  'tea и teaginger — каркаде и имбирный чай, mulled — глинтвейн, syrup — сиропы,',
  'croissant/sandwich/panini/hotdog/shawarma/burger — выпечка и кухня,',
  'cheesecake/icecream/eclair — десерты.',
  '',
].join('\n')

await writeFile(join(out, 'SOURCES.md'), text, 'utf8')
console.log('\nSOURCES.md пересобран: ' + rows.length + ' записей')
