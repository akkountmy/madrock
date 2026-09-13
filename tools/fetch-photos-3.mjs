/**
 * Третий набор фото: только те, чьё НАЗВАНИЕ на Wikimedia Commons совпадает
 * с названием позиции. Unsplash отдаёт картинки, но закрыл метаданные (401),
 * поэтому проверить его снимки нельзя — а нам нужна проверяемость.
 *
 * Для каждого слота задан список запросов и обязательное слово в имени файла.
 * Из подходящих берётся самый крупный горизонтальный кадр, не занятый другим
 * слотом. Результат пишется в assets/SOURCES.md.
 *
 * Запуск: node tools/fetch-photos-3.mjs
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
await mkdir(out, { recursive: true })
const UA = 'MADROCK-coffee-site/1.0 (photo picking; contact: local)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** слот → запросы и обязательное слово в имени файла */
const PLAN = [
  { slot: 'hero',       queries: ['coffee shop interior', 'cafe interior'], must: /caf[eé]|coffee ?(shop|house)|interior/i },
  { slot: 'interior',   queries: ['coffee house interior', 'cafe interior tables'], must: /caf[eé]|coffee ?(shop|house)|interior/i },
  { slot: 'interior2',  queries: ['cafe hall', 'coffee shop counter'], must: /caf[eé]|coffee ?(shop|house)|interior|counter/i },
  { slot: 'barista',    queries: ['barista', 'barista making coffee'], must: /barista/i },
  { slot: 'beans',      queries: ['roasted coffee beans', 'coffee beans'], must: /coffee bean|roasted bean/i },
  { slot: 'espresso',   queries: ['espresso cup', 'espresso shot'], must: /espresso/i },
  { slot: 'americano',  queries: ['americano coffee', 'black coffee cup'], must: /americano|black coffee/i },
  { slot: 'cappuccino', queries: ['cappuccino cup', 'cappuccino'], must: /cappuccino/i },
  { slot: 'big_black',  queries: ['large cappuccino', 'latte glass'], must: /cappuccino|latte/i },
  { slot: 'latte',      queries: ['latte art', 'caffe latte glass'], must: /latte/i },
  { slot: 'latte_coco', queries: ['coconut milk coffee', 'coconut latte'], must: /coconut/i },
  { slot: 'flatwhite',  queries: ['flat white coffee', 'flat white'], must: /flat ?white/i },
  { slot: 'raf',        queries: ['coffee with cream', 'coffee milk glass'], must: /coffee/i },
  { slot: 'mocha',      queries: ['caffe mocha', 'mocha coffee'], must: /mocha/i },
  { slot: 'glace',      queries: ['affogato', 'iced coffee ice cream'], must: /affogato|ice cream|glac/i },
  { slot: 'ice_latte',  queries: ['iced latte', 'iced coffee glass'], must: /iced|ice coffee|ice latte/i },
  { slot: 'signature',  queries: ['caramel latte', 'caramel macchiato'], must: /caramel/i },
  { slot: 'milkshake',  queries: ['milkshake glass', 'milkshake'], must: /milkshake|milk shake/i },
  { slot: 'smoothie',   queries: ['berry smoothie', 'fruit smoothie glass'], must: /smoothie/i },
  { slot: 'lemonade',   queries: ['lemonade glass', 'homemade lemonade'], must: /lemonade|lemon juice/i },
  { slot: 'tea',        queries: ['hibiscus tea', 'ginger tea cup'], must: /tea/i },
  { slot: 'croissant',  queries: ['croissant', 'croissant bakery'], must: /croissant/i },
  { slot: 'sandwich',   queries: ['chicken sandwich', 'sandwich bread'], must: /sandwich/i },
  { slot: 'panini',     queries: ['ham and cheese sandwich grilled', 'panini sandwich'], must: /panini|sandwich|toast/i },
]

const used = new Set()

async function commonsSearch(query) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + query) +
    '&gsrlimit=14&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1700'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return []
    const j = await res.json()
    const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : []
    return pages.map((p) => {
      const info = p.imageinfo && p.imageinfo[0]
      if (!info) return null
      const meta = info.extmetadata || {}
      const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').trim()
      return {
        title: p.title,
        url: info.thumburl || info.url,
        width: info.width || 0,
        height: info.height || 0,
        page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title),
        author: clean(meta.Artist && meta.Artist.value) || 'не указан',
        license: clean(meta.LicenseShortName && meta.LicenseShortName.value) || 'см. страницу файла',
        description: clean(meta.ImageDescription && meta.ImageDescription.value).slice(0, 160),
      }
    }).filter(Boolean)
  } catch (error) {
    return []
  }
}

async function download(url, file) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) return 0
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 8000) return 0
    await writeFile(file, buf)
    return buf.length
  } catch (error) {
    return 0
  }
}

const report = []
// если переданы имена слотов — обрабатываем только их (догон после сбоя)
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const plan = only.length ? PLAN.filter((p) => only.indexOf(p.slot) >= 0) : PLAN

for (const item of plan) {
  let picked = null
  for (const q of item.queries) {
    const found = await commonsSearch(q)
    await sleep(400)
    const good = found
      .filter((c) => item.must.test(c.title) && !used.has(c.title) && c.width >= 700)
      .sort((a, b) => b.width - a.width)
    const landscape = good.filter((c) => c.width > c.height)
    // сначала горизонтальные кадры, но если таких нет — берём вертикальный:
    // он всё равно будет приведён к общему кадру 4:3
    picked = landscape[0] || good[0] || null
    if (picked) break
  }

  if (!picked) {
    report.push({ slot: item.slot, ok: false })
    console.log('✗ ' + item.slot.padEnd(12) + 'подходящего файла не нашлось')
    continue
  }

  used.add(picked.title)
  const size = await download(picked.url, join(out, item.slot + '.jpg'))
  await sleep(350)
  report.push({ slot: item.slot, ok: size > 0, file: picked })
  console.log((size ? '✓' : '✗') + ' ' + item.slot.padEnd(12) + String(Math.round(size / 1024)).padStart(4) + ' КБ · ' + picked.title.replace('File:', '').slice(0, 74))
}

const okCount = report.filter((r) => r.ok).length
console.log('\nобновлено: ' + okCount + ' из ' + PLAN.length)

const lines = ['', '## Проверенный набор (имя файла описывает содержимое)', '',
  'Источник — Wikimedia Commons: имя файла прямо называет то, что на снимке,', 'поэтому соответствие фото и позиции проверяется по метаданным.', '',
  '| Файл | Файл-источник | Автор | Лицензия |', '|---|---|---|---|',
  ...report.filter((r) => r.ok).map((r) => `| ${r.slot}.jpg | [${r.file.title.replace('File:', '')}](${r.file.page}) | ${r.file.author} | ${r.file.license} |`), '']
const prev = await readFile(join(out, 'SOURCES.md'), 'utf8').catch(() => '')
await writeFile(join(out, 'SOURCES.md'), prev + lines.join('\n'), 'utf8')
console.log('источники дописаны в assets/SOURCES.md')
