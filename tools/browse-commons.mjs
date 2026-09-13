/**
 * Просмотр кандидатов Wikimedia Commons по названиям файлов.
 * Нужен, чтобы выбирать фото глазами по заголовку, а не регуляркой.
 *
 * Запуск: node tools/browse-commons.mjs "запрос" ["запрос 2" ...]
 */
const UA = 'MADROCK-coffee-site/1.0 (candidate browsing)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const queries = process.argv.slice(2)
if (!queries.length) {
  console.log('укажите запрос: node tools/browse-commons.mjs "espresso cup"')
  process.exit(0)
}

for (const q of queries) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + q) +
    '&gsrlimit=12&gsrnamespace=6&prop=imageinfo&iiprop=url|size&iiurlwidth=1600'
  try {
    const res = await fetch(api, { headers: { 'user-agent': UA } })
    const text = await res.text()
    console.log('\n=== ' + q + ' === HTTP ' + res.status)
    if (!res.ok || !text.trim().startsWith('{')) { console.log('   недоступно: ' + text.slice(0, 80).replace(/\s+/g, ' ')); continue }
    const j = JSON.parse(text)
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : []
    if (!pages.length) { console.log('   ничего не найдено'); continue }
    pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .sort((a, b) => (b.imageinfo[0].width || 0) - (a.imageinfo[0].width || 0))
      .forEach((p) => {
        const i = p.imageinfo[0]
        console.log('   ' + (i.width + '×' + i.height).padEnd(12) + p.title.replace('File:', '').slice(0, 86))
      })
  } catch (error) {
    console.log('\n=== ' + q + ' === ошибка: ' + String(error && error.message))
  }
  await sleep(500)
}
