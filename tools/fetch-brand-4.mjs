/**
 * Четвёртый подход: открытый VK API (groups.getById) и каталоги заведений,
 * где у кофейни может быть загружен логотип.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets', 'brand')
await mkdir(out, { recursive: true })
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function get(url, label, headers) {
  try {
    const res = await fetch(url, { headers: Object.assign({ 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9' }, headers || {}) })
    const text = await res.text()
    console.log(`\n== ${label} == HTTP ${res.status}, ${text.length} символов`)
    return { status: res.status, text }
  } catch (error) {
    console.log(`\n== ${label} == ошибка: ${String(error && error.message ? error.message : error)}`)
    return null
  }
}

const candidates = []

// 1. открытый VK API
const vk = await get('https://api.vk.com/method/groups.getById?group_id=madrockcoffe_gomel&fields=description,members_count,photo_200,status&v=5.131', 'VK API groups.getById')
if (vk && vk.text.trim().startsWith('{')) {
  try {
    const j = JSON.parse(vk.text)
    const g = j.response && (Array.isArray(j.response) ? j.response[0] : (j.response.groups ? j.response.groups[0] : j.response))
    if (g) {
      console.log('   название: ' + g.name)
      console.log('   статус: ' + (g.status || '—'))
      console.log('   описание: ' + String(g.description || '—').replace(/\s+/g, ' ').slice(0, 240))
      console.log('   подписчиков: ' + (g.members_count || '—'))
      if (g.photo_200) { console.log('   логотип: ' + g.photo_200); candidates.push({ url: g.photo_200, kind: 'VK API photo_200' }) }
      if (g.photo_100) candidates.push({ url: g.photo_100, kind: 'VK API photo_100' })
    } else {
      console.log('   данных группы нет: ' + vk.text.slice(0, 200))
    }
  } catch (error) {
    console.log('   не разобрать JSON: ' + vk.text.slice(0, 160))
  }
} else if (vk) {
  console.log('   ответ не JSON: ' + vk.text.slice(0, 200))
}

// 2. каталоги: og:image страницы заведения
const pages = [
  ['https://restaurantguru.ru/Madrock-Coffee-Gomel', 'RestaurantGuru'],
  ['https://yandex.com/maps/org/madrock_coffee/179551140363/', 'Яндекс.Карты'],
  ['https://2pos.by/29216/786', '2pos.by'],
  ['https://firmi.by/gomel/madrock-33251', 'firmi.by'],
]
for (const [url, label] of pages) {
  const r = await get(url, label)
  if (!r || !r.text) continue
  const m = r.text.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || r.text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i)
  if (m) {
    console.log('   og:image: ' + m[1].slice(0, 150))
    candidates.push({ url: m[1].replace(/&amp;/g, '&'), kind: label })
  } else {
    console.log('   og:image не найден')
  }
  const logos = [...r.text.matchAll(/https?:\/\/[^"'\s]+logo[^"'\s]*\.(?:png|jpg|jpeg|svg|webp)/gi)].slice(0, 3).map((x) => x[0])
  logos.forEach((l) => { console.log('   похоже на логотип: ' + l.slice(0, 140)); candidates.push({ url: l, kind: label + ' (logo)' }) })
}

// скачиваем всё найденное для анализа
console.log('\n-- скачивание кандидатов --')
let n = 0
for (const c of candidates) {
  try {
    const res = await fetch(c.url, { headers: { 'user-agent': UA, 'referer': 'https://www.google.com/' } })
    if (!res.ok) { console.log(`   ✗ ${c.kind}: HTTP ${res.status}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1500) { console.log(`   ✗ ${c.kind}: слишком мало (${buf.length} б)`); continue }
    n += 1
    const ext = (c.url.split('.').pop() || 'jpg').split('?')[0].slice(0, 4)
    const name = 'candidate-' + n + '-' + c.kind.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '.' + ext
    await writeFile(join(out, name), buf)
    console.log(`   ✓ ${name} · ${(buf.length / 1024).toFixed(1)} КБ`)
  } catch (error) {
    console.log(`   ✗ ${c.kind}: ${String(error && error.message ? error.message : error)}`)
  }
}
console.log(`\nскачано кандидатов: ${n}`)
