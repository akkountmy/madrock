/**
 * Поиск кандидатов для раздела Instagram на Викискладе.
 * Викисклад отдаёт настоящие JPEG в полном размере, поэтому здесь и берём
 * оригиналы — у стоковых агрегаторов полноразмерных файлов не оказалось.
 *
 * Запуск: node tools/find-commons-photos.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const UA = 'MADROCK-coffee-site/1.0 (photo search)'
const QUERIES = [
  { key: 'latte', q: 'latte art coffee' },
  { key: 'cappuccino', q: 'cappuccino coffee cup' },
  { key: 'interior', q: 'coffeehouse interior' },
  { key: 'interior2', q: 'cafe interior table window' },
  { key: 'milkshake', q: 'milkshake whipped cream glass' },
  { key: 'iced', q: 'iced coffee glass drink' },
  { key: 'dessert', q: 'cheesecake slice plate' },
  { key: 'pastry', q: 'croissant breakfast pastry' },
  { key: 'barista', q: 'barista latte art pouring' },
  { key: 'espresso', q: 'espresso cup saucer coffee' }
]

const BAD = /logo|diagram|chart|map|sign|menu|poster|stamp|label|banknote|graph|plan|drawing|screenshot/i
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!existsSync('assets/_cand2')) mkdirSync('assets/_cand2', { recursive: true })

const manifest = []
let n = 0

for (const { key, q } of QUERIES) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + q) +
    '&gsrlimit=14&gsrnamespace=6&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=800'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    const text = await res.text()
    if (!res.ok || !text.trim().startsWith('{')) { console.log(key + ': HTTP ' + res.status); continue }
    const j = JSON.parse(text)
    const pages = Object.values(j.query && j.query.pages ? j.query.pages : {})
    const rows = pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .map((p) => ({ p, i: p.imageinfo[0] }))
      .filter(({ p, i }) => !BAD.test(p.title))
      .filter(({ i }) => (i.width || 0) >= 1600 && i.height > 0 && i.width / i.height > 0.55 && i.width / i.height < 1.9)
      .sort((a, b) => (b.i.width * b.i.height) - (a.i.width * a.i.height))
      .slice(0, 7)

    for (const { p, i } of rows) {
      n += 1
      const id = key + '-' + String(n).padStart(2, '0')
      const prev = i.thumburl || i.url
      const name = id + '.jpg'
      try {
        const r2 = await fetch(prev, { headers: { 'user-agent': UA } })
        if (!r2.ok) continue
        const buf = Buffer.from(await r2.arrayBuffer())
        if (buf.length < 8000) continue
        writeFileSync('assets/_cand2/' + name, buf)
        manifest.push({
          id,
          file: 'assets/_cand2/' + name,
          preview: prev,
          original: i.url,
          title: p.title.replace('File:', '').slice(0, 80),
          width: i.width,
          height: i.height,
          page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title),
          author: String(((i.extmetadata || {}).Artist || {}).value || '').replace(/<[^>]*>/g, '').slice(0, 50),
          license: String(((i.extmetadata || {}).LicenseShortName || {}).value || '').slice(0, 30)
        })
      } catch (error) { /* пропускаем */ }
    }
    console.log(key + ': ' + rows.length + ' кандидатов')
  } catch (error) {
    console.log(key + ': ошибка ' + String(error && error.message))
  }
  await sleep(400)
}

writeFileSync('tools/ig-cand2-manifest.json', JSON.stringify(manifest, null, 2))
console.log('\nвсего превью: ' + manifest.length + ' → assets/_cand2/, список в tools/ig-cand2-manifest.json')
