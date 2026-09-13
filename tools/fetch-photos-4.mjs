/**
 * Догон и перебор фото: обязательное слово в имени файла + запрет конфликтующих.
 *
 * Первый заход брал любое совпадение по ключевому слову, из-за чего латте
 * подменялся матча-латте, а «раф» — фотографией балкона в форме чашки.
 * Теперь для каждого слота заданы и обязательное слово, и слова-исключения.
 *
 * Запуск: node tools/fetch-photos-4.mjs
 */
import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
const UA = 'MADROCK-coffee-site/1.0 (photo picking; contact: local)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PLAN = [
  { slot: 'latte',      queries: ['caffe latte cup', 'latte coffee cup', 'latte macchiato'], must: /latte/i, avoid: /matcha|chai|green tea|cake|tea bag/i },
  { slot: 'latte_coco', queries: ['coconut milk', 'coconut drink', 'coconut milk in glass'], must: /coconut/i, avoid: /tree|palm|oil|carton|tin|packag|plantation|shelf|powder/i },
  { slot: 'flatwhite',  queries: ['flat white coffee cup', 'flat white cafe'], must: /flat ?white/i, avoid: /chai|cake|matcha|menu/i },
  { slot: 'raf',        queries: ['coffee with cream cup', 'creamy coffee cup', 'coffee cup with cream'], must: /coffee/i, avoid: /balcony|cup-shaped|plant|tree|machine|beans|roast|plant|shop|sign/i },
  { slot: 'mocha',      queries: ['caffe mocha', 'mocha coffee cup', 'mocha drink'], must: /mocha/i, avoid: /matcha|chai|cake|toast|mushroom|bread|breakfast/i },
  { slot: 'glace',      queries: ['affogato coffee', 'coffee with ice cream', 'glace coffee'], must: /affogato|ice cream|glac/i, avoid: /cone|shop|bucket|van|stand/i },
  { slot: 'ice_latte',  queries: ['iced coffee glass', 'iced latte cup', 'cold brew coffee glass'], must: /iced|ice coffee|cold brew/i, avoid: /tea|machine|bottle|can /i },
  { slot: 'signature',  queries: ['caramel latte', 'caramel macchiato', 'caramel coffee drink'], must: /caramel/i, avoid: /cake|candy|sauce|syrup|bottle|apple|popcorn/i },
  { slot: 'milkshake',  queries: ['milkshake', 'milkshakes glass', 'chocolate milkshake'], must: /milkshake|milk shake/i, avoid: /machine|mixer|powder/i },
  { slot: 'smoothie',   queries: ['berry smoothie', 'smoothie drink', 'mango smoothie'], must: /smoothie/i, avoid: /machine|blender|powder|packag|range|bottle|brand|shelf|product/i },
  // отдельные снимки для позиций, которые до этого делили одну картинку
  { slot: 'doppio',     queries: ['double espresso cup', 'two cups of espresso', 'double espresso glass'], must: /espresso/i, avoid: /machine|beans|shop|sign|plant|roaster|spectrum|bag|pack|chart|poster|logo/i },
  { slot: 'lavraf',     queries: ['lavender latte cup', 'iced lavender latte', 'lavender syrup drink'], must: /lavender/i, avoid: /field|flower bed|plant|soap|oil|essential|bush|garden/i },
  { slot: 'nutmocha',   queries: ['hazelnut latte coffee', 'hazelnut coffee cup', 'nut latte coffee'], must: /hazelnut|nut/i, avoid: /brownie|cake|biscuit|chocolate bar|bakery|tree|shell|dessert|ice cream/i },
  { slot: 'orangeesp',  queries: ['espresso with orange', 'orange coffee drink', 'coffee with orange slice'], must: /orange/i, avoid: /juice|tree|fruit bowl|market|plantation|grove/i },
  { slot: 'icetea',     queries: ['iced tea glass', 'ice tea lemon'], must: /iced tea|ice tea/i, avoid: /machine|powder|packag|bottle|can /i },  { slot: 'teaginger',  queries: ['ginger tea', 'ginger lemon tea cup'], must: /ginger/i, avoid: /root|plant|powder|biscuit|cake|beer|field/i },
]

async function commonsSearch(query) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + query) +
    '&gsrlimit=16&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1700'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return { status: res.status, items: [] }
    const j = await res.json()
    const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : []
    const items = pages.map((p) => {
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
      }
    }).filter(Boolean)
    return { status: res.status, items }
  } catch (error) {
    return { status: String(error && error.message), items: [] }
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
// имена слотов в аргументах — обрабатываем только их
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const plan = only.length ? PLAN.filter((p) => only.indexOf(p.slot) >= 0) : PLAN

for (const item of plan) {
  let picked = null
  let tried = []
  for (const q of item.queries) {
    let found = await commonsSearch(q)
    if (found.items.length === 0) { await sleep(1200); found = await commonsSearch(q) }
    await sleep(500)
    tried.push(q + '(' + found.items.length + ')')
    const good = found.items
      .filter((c) => item.must.test(c.title) && !item.avoid.test(c.title) && c.width >= 700 && !/\.svg$/i.test(c.title))
      .sort((a, b) => (b.width > b.height ? 1 : 0) - (a.width > a.height ? 1 : 0) || b.width - a.width)
    if (good.length) { picked = good[0]; break }
  }

  if (!picked) {
    report.push({ slot: item.slot, ok: false })
    console.log('✗ ' + item.slot.padEnd(12) + 'не найдено · запросы: ' + tried.join(', '))
    continue
  }
  const size = await download(picked.url, join(out, item.slot + '.jpg'))
  await sleep(500)
  report.push({ slot: item.slot, ok: size > 0, file: picked })
  console.log((size ? '✓' : '✗') + ' ' + item.slot.padEnd(12) + String(Math.round(size / 1024)).padStart(4) + ' КБ · ' + picked.title.replace('File:', '').slice(0, 80))
}

const lines = ['', '## Замена безошибочными снимками (повторный отбор)', '',
  '| Файл | Файл-источник | Автор | Лицензия |', '|---|---|---|---|',
  ...report.filter((r) => r.ok).map((r) => `| ${r.slot}.jpg | [${r.file.title.replace('File:', '')}](${r.file.page}) | ${r.file.author} | ${r.file.license} |`), '']
const prev = await readFile(join(out, 'SOURCES.md'), 'utf8').catch(() => '')
await writeFile(join(out, 'SOURCES.md'), prev + lines.join('\n'), 'utf8')
console.log('\nобновлено: ' + report.filter((r) => r.ok).length + ' из ' + plan.length + ' · источники дописаны')
