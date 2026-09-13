/**
 * Второй подход к брендовым материалам: служебный JSON профиля Instagram
 * и поиск брендовых данных прямо в разметке страницы.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets', 'brand')
await mkdir(out, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const APP_ID = '936619743392459'

async function tryJson(url, headers) {
  try {
    const res = await fetch(url, { headers: Object.assign({ 'user-agent': UA }, headers) })
    const text = await res.text()
    console.log('  ' + url.slice(0, 90) + ' → HTTP ' + res.status + ', ' + text.length + ' символов')
    if (res.ok && text.trim().startsWith('{')) return JSON.parse(text)
    return null
  } catch (error) {
    console.log('  ошибка: ' + String(error && error.message ? error.message : error))
    return null
  }
}

console.log('-- попытка 1: web_profile_info --')
const info = await tryJson(
  'https://www.instagram.com/api/v1/users/web_profile_info/?username=madrock_coffee',
  { 'x-ig-app-id': APP_ID, 'accept': 'application/json' },
)

if (info && info.data && info.data.user) {
  const u = info.data.user
  const profile = {
    username: u.username,
    fullName: u.full_name,
    biography: u.biography,
    followers: u.edge_followed_by && u.edge_followed_by.count,
    posts: u.edge_owner_to_timeline_media && u.edge_owner_to_timeline_media.count,
    externalUrl: u.external_url,
    business: u.business_category_name,
    address: u.business_address_json,
    pic: u.profile_pic_url_hd || u.profile_pic_url,
  }
  console.log('\n-- профиль --')
  for (const [k, v] of Object.entries(profile)) console.log(`${k}: ${v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : v}`)

  if (profile.pic) {
    const img = await fetch(profile.pic, { headers: { 'user-agent': UA } })
    if (img.ok) {
      const buf = Buffer.from(await img.arrayBuffer())
      await writeFile(join(out, 'logo-instagram.jpg'), buf)
      console.log('\nлоготип скачан: assets/brand/logo-instagram.jpg · ' + (buf.length / 1024).toFixed(1) + ' КБ')
    }
  }
  await writeFile(join(out, 'instagram-profile.json'), JSON.stringify(profile, null, 2), 'utf8')

  // последние публикации — оттуда можно взять визуальный стиль
  const edges = (u.edge_owner_to_timeline_media && u.edge_owner_to_timeline_media.edges) || []
  const caps = edges.slice(0, 12).map((e) => (e.node.edge_media_to_caption && e.node.edge_media_to_caption.edges[0] ? e.node.edge_media_to_caption.edges[0].node.text : '')).filter(Boolean)
  if (caps.length) {
    console.log('\n-- подписи последних публикаций --')
    caps.slice(0, 8).forEach((c) => console.log('  • ' + c.replace(/\n+/g, ' / ').slice(0, 160)))
    await writeFile(join(out, 'instagram-captions.txt'), caps.join('\n---\n'), 'utf8')
  }
} else {
  console.log('\nJSON профиля недоступен — ищу брендовые данные в разметке страницы')
  const res = await fetch('https://www.instagram.com/madrock_coffee/', { headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9' } })
  const html = await res.text()
  await writeFile(join(out, '_page.html'), html, 'utf8')
  const keys = ['profile_pic_url', 'biography', 'full_name', 'edge_followed_by', 'external_url', 'madrock']
  for (const k of keys) {
    const at = html.indexOf(k)
    console.log(`  ${k}: ${at < 0 ? 'не найдено' : 'найдено на позиции ' + at}`)
    if (at >= 0) console.log('     ' + html.slice(Math.max(0, at - 60), at + 160).replace(/\s+/g, ' '))
  }
}
