/**
 * Третий подход к брендовому логотипу: VK-сообщество и зеркала Instagram.
 * Аватар в VK обычно тот же, что и в Instagram.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets', 'brand')
await mkdir(out, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const meta = (html, prop) => {
  const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]+content=["\']([^"\']+)["\']', 'i')
  const m = html.match(re)
  if (m) return m[1].replace(/&amp;/g, '&')
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + prop + '["\']', 'i')
  const m2 = html.match(re2)
  return m2 ? m2[1].replace(/&amp;/g, '&') : null
}

async function grab(label, url, opts) {
  try {
    const res = await fetch(url, Object.assign({ headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8' } }, opts || {}))
    const text = await res.text()
    console.log(`\n== ${label} == HTTP ${res.status}, ${text.length} символов`)
    const found = { title: meta(text, 'og:title'), desc: meta(text, 'og:description'), image: meta(text, 'og:image') }
    for (const [k, v] of Object.entries(found)) console.log(`   ${k}: ${v === null ? '—' : String(v).slice(0, 160)}`)
    return { url, status: res.status, text, found }
  } catch (error) {
    console.log(`\n== ${label} == ошибка: ${String(error && error.message ? error.message : error)}`)
    return null
  }
}

const results = []
results.push(await grab('VK-сообщество', 'https://vk.com/madrockcoffe_gomel'))
results.push(await grab('Instagram __a=1', 'https://www.instagram.com/madrock_coffee/?__a=1&__d=dis', { headers: { 'user-agent': UA, 'x-ig-app-id': '936619743392459' } }))
results.push(await grab('Зеркало picuki', 'https://www.picuki.com/profile/madrock_coffee'))
results.push(await grab('Зеркало imginn', 'https://imginn.com/madrock_coffee/'))

// скачиваем первый найденный аватар
for (const r of results) {
  if (!r || !r.found || !r.found.image) continue
  try {
    const img = await fetch(r.found.image, { headers: { 'user-agent': UA, 'referer': r.url } })
    if (!img.ok) { console.log('   аватар не скачался: HTTP ' + img.status); continue }
    const buf = Buffer.from(await img.arrayBuffer())
    if (buf.length < 2000) { console.log('   аватар слишком мал (' + buf.length + ' байт)'); continue }
    await writeFile(join(out, 'logo-brand.jpg'), buf)
    await writeFile(join(out, 'logo-source.txt'), r.url + '\n' + r.found.image + '\n', 'utf8')
    console.log('\nЛОГОТИП СКАЧАН: assets/brand/logo-brand.jpg · ' + (buf.length / 1024).toFixed(1) + ' КБ · источник: ' + r.url)
    break
  } catch (error) {
    console.log('   ошибка загрузки аватара: ' + String(error && error.message ? error.message : error))
  }
}
