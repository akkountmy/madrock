/**
 * Проверка доступа к поиску Unsplash: нужен, чтобы подбирать фото не «по памяти»,
 * а по описанию из выдачи, и тут же его сверять с названием позиции.
 * Запуск: node tools/probe-unsplash.mjs
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function tryUrl(url, label) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/json, text/plain, */*' } })
    const text = await res.text()
    console.log(`\n== ${label} == HTTP ${res.status}, ${text.length} символов`)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const j = JSON.parse(text)
        const results = j.results || (j.photos && j.photos.results) || null
        if (results) {
          console.log('   найдено результатов: ' + results.length)
          results.slice(0, 5).forEach((p) => {
            console.log('   • ' + (p.alt_description || p.description || '(без описания)'))
            console.log('     id=' + p.id + '  url=' + ((p.urls && p.urls.regular) || '').slice(0, 70))
          })
        } else {
          console.log('   ключи ответа: ' + Object.keys(j).slice(0, 8).join(', '))
        }
      } catch (e) { console.log('   не JSON: ' + text.slice(0, 120)) }
    } else {
      console.log('   ответ не JSON: ' + text.slice(0, 120).replace(/\s+/g, ' '))
    }
    return res.status
  } catch (error) {
    console.log(`\n== ${label} == ошибка: ${String(error && error.message ? error.message : error)}`)
    return null
  }
}

await tryUrl('https://unsplash.com/napi/search/photos?query=iced%20latte&per_page=5', 'поиск napi: iced latte')
await tryUrl('https://unsplash.com/napi/search/photos?query=croissant&per_page=5', 'поиск napi: croissant')
await tryUrl('https://unsplash.com/napi/photos/photo-1511920170033-f8396924c348', 'карточка по CDN-id (проверка формата)')
