/**
 * Получение брендовых материалов MADROCK COFFEE из Instagram.
 *
 * Instagram отдаёт анонимному запросу страницу-заглушку, но в ней обычно
 * остаются og-теги с аватаром профиля и описанием. Этого достаточно, чтобы
 * взять настоящий логотип и подтянуть палитру под бренд.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets', 'brand')
await mkdir(out, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const PROFILE = 'https://www.instagram.com/madrock_coffee/'

const meta = (html, prop) => {
  const patterns = [
    new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]+content=["\']([^"\']+)["\']', 'i'),
    new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + prop + '["\']', 'i'),
    new RegExp('<meta[^>]+name=["\']' + prop + '["\'][^>]+content=["\']([^"\']+)["\']', 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  }
  return null
}

console.log('запрос профиля: ' + PROFILE)
let html = ''
try {
  const res = await fetch(PROFILE, {
    headers: {
      'user-agent': UA,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
  })
  console.log('статус: ' + res.status)
  html = await res.text()
  console.log('получено символов: ' + html.length)
} catch (error) {
  console.log('сеть недоступна: ' + String(error && error.message ? error.message : error))
}

if (html) {
  const info = {
    title: meta(html, 'og:title'),
    description: meta(html, 'og:description'),
    image: meta(html, 'og:image'),
    url: meta(html, 'og:url'),
  }
  console.log('\n-- og-данные --')
  for (const [k, v] of Object.entries(info)) console.log(`${k}: ${v === null ? 'нет' : v}`)

  // иногда в разметке есть альтернативные варианты аватара
  const avatars = [...html.matchAll(/https:\/\/[^"'\\ ]+?(?:s150x150|s320x320|profile_pic)[^"'\\ ]*?\.(?:jpg|webp)/g)]
    .map((m) => m[0].replace(/\\u0026/g, '&').replace(/\\\//g, '/'))
  const unique = [...new Set(avatars)].slice(0, 6)
  if (unique.length) {
    console.log('\n-- найденные варианты аватара --')
    unique.forEach((u) => console.log('  ' + u.slice(0, 140)))
  }

  const target = info.image || unique[0]
  if (target) {
    try {
      const img = await fetch(target, { headers: { 'user-agent': UA } })
      if (img.ok) {
        const buf = Buffer.from(await img.arrayBuffer())
        await writeFile(join(out, 'logo-instagram.jpg'), buf)
        console.log('\nлоготип скачан: assets/brand/logo-instagram.jpg · ' + (buf.length / 1024).toFixed(1) + ' КБ')
      } else {
        console.log('\nне удалось скачать логотип: HTTP ' + img.status)
      }
    } catch (error) {
      console.log('\nне удалось скачать логотип: ' + String(error && error.message ? error.message : error))
    }
  } else {
    console.log('\nURL аватара не найден')
  }

  await writeFile(join(out, 'instagram-meta.json'), JSON.stringify({ profile: PROFILE, ...info, avatarCandidates: unique }, null, 2), 'utf8')
  console.log('метаданные сохранены: assets/brand/instagram-meta.json')
}
