/**
 * Поиск кандидатов для раздела Instagram.
 * Источник — Openverse (агрегатор Flickr, Wikimedia и др.), только свободные
 * лицензии. Результат складывается в tools/ig-candidates.json.
 *
 * Запуск: node tools/find-ig-photos.mjs
 */
import { writeFileSync } from 'node:fs'

const UA = 'MADROCK-coffee-site/1.0 (photo search)'
const GOOD_LICENSES = ['cc0', 'pdm', 'by', 'by-sa']

const QUERIES = [
  { key: 'latte', q: 'latte art coffee cup' },
  { key: 'cappuccino', q: 'cappuccino cup coffee foam' },
  { key: 'interior', q: 'coffee shop interior cozy' },
  { key: 'interior2', q: 'cafe interior wooden table window' },
  { key: 'milkshake', q: 'milkshake whipped cream glass' },
  { key: 'milkshake2', q: 'milkshake glass straw dessert drink' },
  { key: 'iced', q: 'iced coffee glass drink' },
  { key: 'smoothie', q: 'smoothie glass berries drink' },
  { key: 'dessert', q: 'cheesecake slice dessert plate' },
  { key: 'pastry', q: 'croissant pastry breakfast table' },
  { key: 'barista', q: 'barista pouring milk coffee' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const found = []

for (const { key, q } of QUERIES) {
  const url = 'https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) +
    '&page_size=20&license_type=commercial&aspect_ratio=square,wide&size=large'
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    const text = await res.text()
    if (!res.ok || !text.trim().startsWith('{')) {
      console.log(key + ': недоступно, HTTP ' + res.status)
      continue
    }
    const j = JSON.parse(text)
    const rows = (j.results || [])
      .filter((r) => GOOD_LICENSES.includes(String(r.license).toLowerCase()))
      .filter((r) => (r.width || 0) >= 1200 && (r.height || 0) >= 900)
      .filter((r) => !/logo|diagram|chart|map|sign|menu|poster|stamp|label/i.test(String(r.title || '')))
      .slice(0, 8)
      .map((r) => ({
        key,
        title: String(r.title || '').slice(0, 70),
        url: r.url,
        thumb: r.thumbnail,
        width: r.width,
        height: r.height,
        license: r.license,
        creator: String(r.creator || '').slice(0, 40),
        source: r.source,
        foreign: r.foreign_landing_url,
        tags: (r.tags || []).slice(0, 6).map((t) => t.name).join(', ')
      }))
    found.push(...rows)
    console.log(key + ': ' + rows.length + ' кандидатов из ' + (j.result_count || 0))
    rows.forEach((r) => console.log('   ' + (r.width + '×' + r.height).padEnd(11) + r.license.padEnd(7) + r.title))
  } catch (error) {
    console.log(key + ': ошибка ' + String(error && error.message))
  }
  await sleep(400)
}

writeFileSync('tools/ig-candidates.json', JSON.stringify(found, null, 2))
console.log('\nвсего кандидатов: ' + found.length + ' → tools/ig-candidates.json')
