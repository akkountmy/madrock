/**
 * Скачивание выбранных снимков для раздела Instagram (полный размер).
 * Выбор сделан по внешнему виду: кандидатов смотрела модель со зрением,
 * итоговый список — ниже.
 *
 * Запуск: node tools/get-ig-photos.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const UA = 'MADROCK-coffee-site/1.0 (photo download)'
const manifest = JSON.parse(readFileSync('tools/ig-cand-manifest.json', 'utf8'))
const byId = new Map(manifest.map((m) => [m.id, m]))

/* порядок плиток в разделе Instagram и подписи к ним */
const chosen = [
  { id: 'iced-22', out: 'ig1.jpg', cap: 'Айс-латте с молочной волной' },
  { id: 'barista-35', out: 'ig2.jpg', cap: 'Бариста рисует латте' },
  { id: 'latte-06', out: 'ig3.jpg', cap: 'Латте в тёплых ладонях' },
  { id: 'latte-02', out: 'ig4.jpg', cap: 'Лебедь на пенке' },
  { id: 'cappuccino-10', out: 'ig5.jpg', cap: 'Место у окна' },
  { id: 'cappuccino-14', out: 'ig6.jpg', cap: 'Кофе и гранола на завтрак' },
  { id: 'dessert-25', out: 'ig7.jpg', cap: 'Клубничный чизкейк' },
  { id: 'interior2-16', out: 'ig8.jpg', cap: 'Утро у большого окна' }
]

if (!existsSync('assets/_orig')) mkdirSync('assets/_orig', { recursive: true })

const sources = []
for (const item of chosen) {
  const c = byId.get(item.id)
  if (!c) { console.log('нет кандидата ' + item.id); continue }
  const url = c.full || c.url
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) { console.log(item.id + ': HTTP ' + res.status); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync('assets/_orig/' + item.out, buf)
    sources.push({
      file: item.out,
      caption: item.cap,
      title: c.title,
      license: c.license,
      creator: c.creator,
      origin: c.origin,
      size: c.width + '×' + c.height,
      kb: Math.round(buf.length / 1024)
    })
    console.log(item.out + ' ← ' + item.id + ' · ' + Math.round(buf.length / 1024) + ' КБ · ' + c.license + ' · ' + c.creator)
  } catch (error) {
    console.log(item.id + ': ошибка ' + String(error && error.message))
  }
}

writeFileSync('tools/ig-sources.json', JSON.stringify(sources, null, 2))
console.log('\nскачано: ' + sources.length + ' файлов → assets/_orig/, источники в tools/ig-sources.json')
