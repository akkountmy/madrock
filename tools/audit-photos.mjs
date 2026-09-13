/**
 * Проверка соответствия фото названию позиции по метаданным источников.
 *
 * Смотреть картинки агент не может, зато у каждого файла есть страница-источник
 * с описанием. Для Wikimedia это название файла и описание на странице, для
 * Unsplash — alt-описание и теги из открытого JSON. Сверяем их со слотами меню.
 *
 * Запуск: node tools/audit-photos.mjs
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const UA = 'MADROCK-coffee-site/1.0 (photo check)'

/** слот → что должно быть на фото (ключевые слова в любом регистре) */
const EXPECT = {
  hero: ['cafe', 'coffee shop', 'bar', 'interior', 'people', 'counter'],
  interior: ['interior', 'cafe', 'coffee shop', 'table', 'chair'],
  interior2: ['interior', 'cafe', 'coffee shop', 'table', 'window'],
  barista: ['barista', 'bar', 'coffee', 'making'],
  beans: ['bean', 'roast', 'coffee'],
  signature: ['coffee', 'caramel', 'latte', 'drink', 'cup'],
  espresso: ['espresso', 'shot', 'coffee'],
  americano: ['americano', 'black coffee', 'coffee'],
  cappuccino: ['cappuccino', 'coffee', 'milk', 'latte art'],
  big_black: ['cappuccino', 'latte', 'coffee', 'cup'],
  latte: ['latte', 'coffee', 'milk'],
  latte_coco: ['latte', 'coconut', 'milk', 'coffee'],
  flatwhite: ['flat white', 'latte', 'coffee', 'cup'],
  raf: ['coffee', 'cream', 'latte', 'milk'],
  mocha: ['mocha', 'chocolate', 'coffee'],
  glace: ['iced', 'ice cream', 'affogato', 'coffee', 'glass'],
  ice_latte: ['iced', 'latte', 'coffee', 'glass'],
  milkshake: ['milkshake', 'shake', 'cream', 'strawberry', 'glass'],
  frappe: ['frappe', 'frappé', 'iced', 'coffee', 'glass'],
  smoothie: ['smoothie', 'berry', 'berries', 'fruit'],
  lemonade: ['lemonade', 'lemon', 'drink', 'glass'],
  cocoa: ['cocoa', 'chocolate', 'cup', 'mug'],
  hot_choc: ['chocolate', 'cocoa', 'marshmallow', 'mug'],
  tea: ['tea', 'cup', 'teapot', 'glass'],
  mulled: ['mulled', 'glühwein', 'gluhwein', 'wine', 'spice'],
  syrup: ['syrup', 'bottle', 'flavored'],
  croissant: ['croissant', 'pastry', 'bakery'],
  sandwich: ['sandwich', 'bread', 'toast'],
  panini: ['panini', 'sandwich', 'grilled'],
  hotdog: ['hot dog', 'hotdog', 'sausage'],
  shawarma: ['shawarma', 'doner', 'kebab', 'wrap'],
  burger: ['burger', 'cheeseburger', 'hamburger'],
  cheesecake: ['cheesecake', 'cake', 'strawberry'],
  icecream: ['ice cream', 'scoop', 'gelato'],
  eclair: ['eclair', 'éclair', 'choux', 'pastry', 'cream'],
  doppio: ['espresso', 'coffee'],
  lavraf: ['coffee', 'milk', 'cream', 'latte'],
  nutmocha: ['hazelnut', 'nut', 'latte', 'coffee'],
  teaginger: ['ginger', 'tea'],
  orangeesp: ['orange', 'coffee'],
  icetea: ['iced tea', 'ice tea', 'tea'],
}

/* --- разбираем SOURCES.md: слот → источник -------------------------------
   Таблицы бывают на три и на четыре колонки, поэтому берём ячейки по разделителю,
   а не по шаблону строки. Побеждает последнее упоминание слота: файл источников
   дописывается по мере замен фото. */
const sources = await readFile(join(root, 'assets', 'SOURCES.md'), 'utf8')
const map = {}
for (const line of sources.split('\n')) {
  if (line.trim().indexOf('|') !== 0) continue
  const cells = line.split('|').map((s) => s.trim())
  const file = cells[1] || ''
  const m = file.match(/^([a-z_0-9]+)\.jpg$/i)
  if (!m) continue
  const source = cells[2] || ''
  map[m[1]] = (source === '' || source === 'не найдено') ? null : source
}

const unsplashId = (s) => {
  const m = String(s).match(/photo-([0-9a-zA-Z_-]+)/)
  return m ? m[1] : null
}
const commonsTitle = (s) => {
  const m = String(s).match(/\((https?:\/\/commons\.wikimedia\.org\/wiki\/[^\s]+?)\)\s*(?:\||$)/) || String(s).match(/(https?:\/\/commons\.wikimedia\.org\/wiki\/[^\s|]+)/)
  if (!m) return null
  const fromUrl = m[1].match(/wiki\/(.+)$/)
  return fromUrl ? decodeURIComponent(fromUrl[1]).replace(/^File:/, '') : null
}

/** Описание фото на Unsplash через открытый JSON. */
async function unsplashInfo(id) {
  try {
    const res = await fetch('https://unsplash.com/napi/photos/' + id, { headers: { 'user-agent': UA, 'accept': 'application/json' } })
    if (!res.ok) return { ok: false, status: res.status }
    const j = await res.json()
    const tags = (j.tags || []).map((t) => t.title || t.name).filter(Boolean)
    return { ok: true, text: [j.alt_description, j.description, tags.join(', ')].filter(Boolean).join(' · ') }
  } catch (error) {
    return { ok: false, status: String(error && error.message) }
  }
}

/** Описание файла на Wikimedia Commons. */
async function commonsInfo(title) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=' + encodeURIComponent(title)
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    if (!res.ok) return { ok: false, status: res.status }
    const j = await res.json()
    const page = Object.values(j.query.pages)[0]
    const meta = (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].extmetadata) || {}
    const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').trim()
    return { ok: true, text: [clean(meta.ImageDescription && meta.ImageDescription.value), clean(meta.ObjectName && meta.ObjectName.value), page.title].filter(Boolean).join(' · ') }
  } catch (error) {
    return { ok: false, status: String(error && error.message) }
  }
}

const rows = []
for (const slot of Object.keys(EXPECT)) {
  const src = map[slot]
  let subject = null
  let kind = 'нет источника'
  if (src) {
    const uid = unsplashId(src)
    const ctitle = commonsTitle(src)
    if (uid) {
      kind = 'Unsplash'
      const info = await unsplashInfo(uid)
      subject = info.ok ? info.text : null
      if (!info.ok) kind = 'Unsplash (' + info.status + ')'
    } else if (ctitle) {
      kind = 'Commons'
      const info = await commonsInfo(ctitle)
      subject = info.ok ? info.text : ctitle
      if (!info.ok) kind = 'Commons (' + info.status + ')'
    } else {
      subject = src
    }
  }
  const hay = String(subject || '').toLowerCase()
  const words = EXPECT[slot]
  const hit = words.filter((w) => hay.indexOf(w) >= 0)
  rows.push({ slot, kind, subject: subject === null ? '—' : subject, hit: hit.length > 0, hits: hit.slice(0, 4).join(', ') })
}

console.log('слот'.padEnd(14) + 'источник'.padEnd(14) + 'совпадение'.padEnd(30) + 'описание источника')
console.log('-'.repeat(130))
for (const r of rows) {
  const verdict = r.hit ? 'да (' + r.hits + ')' : 'НЕТ'
  console.log(r.slot.padEnd(14) + r.kind.padEnd(14) + verdict.padEnd(30) + r.subject.slice(0, 80))
}
const bad = rows.filter((r) => !r.hit)
console.log('\nне подтверждено: ' + bad.length + ' из ' + rows.length + (bad.length ? ' → ' + bad.map((r) => r.slot).join(', ') : ''))
