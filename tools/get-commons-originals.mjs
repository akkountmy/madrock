/**
 * Скачивание выбранных оригиналов с Викисклада (полный размер, всегда JPEG).
 * Выбор сделан моделью со зрением: она смотрела превью и ставила оценки.
 *
 * Запуск: node tools/get-commons-originals.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const UA = 'MADROCK-coffee-site/1.0 (photo download)'
const manifest = readFileSync('tools/ig-cand2-manifest.json', 'utf8')
const list = JSON.parse(manifest)
const byId = new Map(list.map((m) => [m.id, m]))

/* порядок плиток в разделе Instagram */
const chosen = [
  { id: 'barista-50', out: 'ig1.jpg', cap: 'Бариста рисует латте' },
  { id: 'dessert-40', out: 'ig2.jpg', cap: 'Ягодный муссовый торт' },
  { id: 'cappuccino-11', out: 'ig3.jpg', cap: 'Латте-арт в жёлтой чашке' },
  { id: 'iced-30', out: 'ig4.jpg', cap: 'Холодный латте в руке' },
  { id: 'espresso-52', out: 'ig5.jpg', cap: 'Эспрессо и шоколад' },
  { id: 'dessert-42', out: 'ig6.jpg', cap: 'Чизкейк с малиной' },
  { id: 'interior2-23', out: 'ig7.jpg', cap: 'Тёплое дерево и свет' },
  { id: 'latte-05', out: 'ig8.jpg', cap: 'Лебедь на латте' }
]

if (!existsSync('assets/_orig2')) mkdirSync('assets/_orig2', { recursive: true })

const sources = []
for (const item of chosen) {
  const c = byId.get(item.id)
  if (!c) { console.log('нет кандидата ' + item.id); continue }
  const path = 'assets/_orig2/' + item.out

  /* уже скачанные файлы не тянем повторно: Викисклад отвечает 429 на частые
     запросы, а метаданные всё равно берём из списка кандидатов */
  if (existsSync(path)) {
    sources.push({
      file: item.out, caption: item.cap, title: c.title, author: c.author,
      license: c.license, page: c.page, size: c.width + '×' + c.height,
      kb: Math.round(readFileSync(path).length / 1024)
    })
    console.log(item.out + ' ← ' + item.id + ' (уже скачан)')
    continue
  }

  try {
    let buf = null
    let res = await fetch(c.original, { headers: { 'user-agent': UA } })
    if (res.ok) buf = Buffer.from(await res.arrayBuffer())
    else {
      /* большие оригиналы Викисклад иногда отдаёт с 429 — берём то же фото
         уменьшенным до 2400 px: для плитки 1080 этого с запасом хватает */
      console.log(item.id + ': оригинал HTTP ' + res.status + ', пробую уменьшенную копию')
      const alt = 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
        encodeURIComponent(c.title.replace(/ /g, '_')) + '?width=2400'
      res = await fetch(alt, { headers: { 'user-agent': UA, accept: 'image/jpeg' } })
      if (res.ok) buf = Buffer.from(await res.arrayBuffer())
    }
    if (buf === null) { console.log(item.id + ': не удалось получить файл'); continue }
    if (!(buf[0] === 0xff && buf[1] === 0xd8)) { console.log(item.id + ': не JPEG, пропуск'); continue }
    writeFileSync(path, buf)
    sources.push({
      file: item.out,
      caption: item.cap,
      title: c.title,
      author: c.author,
      license: c.license,
      page: c.page,
      size: c.width + '×' + c.height,
      kb: Math.round(buf.length / 1024)
    })
    console.log(item.out + ' ← ' + item.id + ' · ' + c.width + '×' + c.height + ' · ' + Math.round(buf.length / 1024) + ' КБ · ' + (c.license || 'лицензия не указана'))
  } catch (error) {
    console.log(item.id + ': ошибка ' + String(error && error.message))
  }
}

writeFileSync('tools/ig-sources.json', JSON.stringify(sources, null, 2))
console.log('\nскачано: ' + sources.length + ' файлов → assets/_orig2/')
