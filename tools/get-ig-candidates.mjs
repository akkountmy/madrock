/**
 * Скачивание превью кандидатов для раздела Instagram.
 * Полные файлы качаем только для выбранных — здесь нужны маленькие картинки,
 * чтобы их можно было просмотреть и отобрать лучшие.
 *
 * Запуск: node tools/get-ig-candidates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const UA = 'MADROCK-coffee-site/1.0 (candidate download)'
const list = JSON.parse(readFileSync('tools/ig-candidates.json', 'utf8'))
if (!existsSync('assets/_cand')) mkdirSync('assets/_cand', { recursive: true })

const seen = new Set()
const manifest = []
let ok = 0

for (const c of list) {
  const src = c.thumb || c.url
  if (!src) continue
  const id = c.key + '-' + String(manifest.length + 1).padStart(2, '0')
  if (seen.has(src)) continue
  seen.add(src)
  const name = id + '.jpg'
  try {
    const res = await fetch(src, { headers: { 'user-agent': UA } })
    if (!res.ok) { console.log('пропуск ' + id + ': HTTP ' + res.status); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 8000) { console.log('пропуск ' + id + ': слишком маленький файл'); continue }
    writeFileSync('assets/_cand/' + name, buf)
    manifest.push({ id, file: 'assets/_cand/' + name, title: c.title, key: c.key, width: c.width, height: c.height, license: c.license, creator: c.creator, origin: c.foreign || c.url, full: c.url })
    ok += 1
  } catch (error) {
    console.log('пропуск ' + id + ': ' + String(error && error.message))
  }
}

writeFileSync('tools/ig-cand-manifest.json', JSON.stringify(manifest, null, 2))
console.log('скачано превью: ' + ok + ' → assets/_cand/, список в tools/ig-cand-manifest.json')
