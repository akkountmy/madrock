/**
 * Загрузка фотографий для сайта MADROCK.
 *
 * Стоковые фото кладутся локально в assets/, чтобы страница не зависела от
 * внешней сети: в Беларуси это лишний риск, а окно превью должно показывать
 * реальные снимки, а не заглушки.
 *
 * Источники: сначала Unsplash CDN (по известным id), если слот не закрыт —
 * Wikimedia Commons через открытый API (свободные лицензии, с указанием автора).
 * Отчёт о происхождении каждого файла пишется в assets/SOURCES.md.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
await mkdir(out, { recursive: true })

const UA = 'MADROCK-coffee-site/1.0 (demo site build; contact: local)'

/** Слот → известный id Unsplash и/или поисковый запрос для Wikimedia Commons. */
const SLOTS = [
  { slot: 'hero',        unsplash: '1554118811-1e0d58224f24', q: 'coffee shop interior people' },
  { slot: 'interior',    unsplash: '1501339847302-ac426a4a7cbb', q: 'cafe interior dark' },
  { slot: 'interior2',   unsplash: '1559925393-8be0ec4767c8', q: 'coffee house tables' },
  { slot: 'barista',     unsplash: '1497636577773-f1231844b336', q: 'barista making coffee' },
  { slot: 'espresso',    unsplash: '1442975631115-c4f7b05b8a2c', q: 'espresso machine shot' },
  { slot: 'americano',   unsplash: '1509042239860-f550ce710b93', q: 'americano coffee cup' },
  { slot: 'cappuccino',  unsplash: '1495474472287-4d71bcdd2085', q: 'cappuccino cup' },
  { slot: 'big_black',   unsplash: '1461023058943-07fcbe16d735', q: 'large coffee cup takeaway' },
  { slot: 'latte',       unsplash: '1511920170033-f8396924c348', q: 'latte art' },
  { slot: 'latte_coco',  unsplash: '1470337458703-46ad1756a187', q: 'latte glass milk' },
  { slot: 'flatwhite',   unsplash: '1447933601403-0c6688de566e', q: 'flat white coffee' },
  { slot: 'raf',         unsplash: '1461988320302-91bde64fc8e4', q: 'creamy coffee drink' },
  { slot: 'mocha',       unsplash: '1513558161293-cdaf765ed2fd', q: 'mocha chocolate coffee' },
  { slot: 'glace',       unsplash: '1578314675249-a6910f80cc4e', q: 'iced coffee ice cream' },
  { slot: 'ice_latte',   unsplash: '1461023058943-07fcbe16d735', q: 'iced latte glass' },
  { slot: 'milkshake',   q: 'milkshake glass whipped cream' },
  { slot: 'frappe',      q: 'frappe coffee blended ice' },
  { slot: 'smoothie',    q: 'smoothie glass berries' },
  { slot: 'lemonade',    q: 'lemonade glass mint' },
  { slot: 'cocoa',       q: 'hot chocolate cocoa cup' },
  { slot: 'hot_choc',    q: 'hot chocolate mug marshmallow' },
  { slot: 'tea',         unsplash: '1572442388796-11668a67e53d', q: 'tea pot cup' },
  { slot: 'mulled',      q: 'mulled wine hot drink spices' },
  { slot: 'signature',   unsplash: '1442512595331-e89e73853f31', q: 'coffee beans syrup bar' },
  { slot: 'syrup',       q: 'coffee syrup bottles bar' },
  { slot: 'croissant',   unsplash: '1521017432531-fbd92d768814', q: 'croissant pastry' },
  { slot: 'sandwich',    unsplash: '1504674900247-0877df9cc836', q: 'sandwich panini' },
  { slot: 'panini',      q: 'panini grilled sandwich' },
  { slot: 'hotdog',      q: 'hot dog bun' },
  { slot: 'shawarma',    q: 'shawarma wrap doner' },
  { slot: 'burger',      q: 'burger cheeseburger' },
  { slot: 'cheesecake',  q: 'cheesecake slice' },
  { slot: 'icecream',    q: 'ice cream scoop cone' },
  { slot: 'eclair',      q: 'eclair pastry cream' },
  { slot: 'beans',       unsplash: '1442512595331-e89e73853f31', q: 'roasted coffee beans' },
]

const results = []

/** Скачать URL в файл, вернуть размер или null. */
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

/** Найти свободное фото в Wikimedia Commons по запросу. */
async function commons(query) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + query) +
    '&gsrlimit=6&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const json = await res.json()
    const pages = json && json.query && json.query.pages ? Object.values(json.query.pages) : []
    for (const page of pages) {
      const info = page.imageinfo && page.imageinfo[0]
      if (!info) continue
      const url = info.thumburl || info.url
      if (!url) continue
      const meta = info.extmetadata || {}
      const pick = (k) => (meta[k] && meta[k].value ? String(meta[k].value).replace(/<[^>]*>/g, '') : '')
      return { url, title: page.title, artist: pick('Artist') || 'не указан', license: pick('LicenseShortName') || 'см. страницу файла', page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title) }
    }
    return null
  } catch (error) {
    return null
  }
}

for (const s of SLOTS) {
  const file = join(out, s.slot + '.jpg')
  let size = null
  let source = null

  if (s.unsplash) {
    size = await download(`https://images.unsplash.com/photo-${s.unsplash}?auto=format&fit=crop&w=1400&h=1000&q=72`, file)
    if (size) source = { kind: 'Unsplash', url: `https://images.unsplash.com/photo-${s.unsplash}`, license: 'Unsplash License (свободно, в т.ч. коммерчески)' }
  }
  if (!size && s.q) {
    const found = await commons(s.q)
    if (found) {
      size = await download(found.url, file)
      if (size) source = { kind: 'Wikimedia Commons', url: found.page, license: found.license, artist: found.artist }
    }
  }
  results.push({ slot: s.slot, ok: Boolean(size), size, source })
  console.log(`${size ? '✓' : '✗'} ${s.slot.padEnd(12)} ${size ? (size / 1024).toFixed(0) + ' КБ' : 'не найдено'} ${source ? '· ' + source.kind : ''}`)
}

const okCount = results.filter((r) => r.ok).length
const lines = [
  '# Источники фотографий',
  '',
  `Скачано ${okCount} из ${results.length} слотов. Файлы лежат рядом, в папке \`assets/\`.`,
  '',
  'Фотографии — стоковые, под свободными лицензиями, и служат заглушками до съёмки кофейни.',
  'Реальные фотографии точек MADROCK, собранные из отзывов, лежат в `research/_img/` —',
  'их можно использовать только с разрешения авторов и владельца кофейни.',
  '',
  '| Файл | Источник | Лицензия |',
  '|---|---|---|',
  ...results.map((r) => r.ok
    ? `| ${r.slot}.jpg | ${r.source.kind}${r.source.artist ? ' · ' + r.source.artist : ''} ${r.source.url} | ${r.source.license || '—'} |`
    : `| ${r.slot}.jpg | не найдено | — |`),
  '',
]
await writeFile(join(out, 'SOURCES.md'), lines.join('\n'), 'utf8')
console.log(`\nassets/SOURCES.md записан · успешно ${okCount}/${results.length}`)
