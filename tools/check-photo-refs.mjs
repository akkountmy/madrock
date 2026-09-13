/**
 * Проверка ссылок на фото: каждый PHOTO.<ключ>, упомянутый в коде, должен быть
 * объявлен в объекте PHOTO. Именно такая опечатка давала карточку без картинки
 * (PHOTO.table остался в разметке контактов, когда набор фото переписывали).
 *
 * Запуск: node tools/check-photo-refs.mjs
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [data, app, body] = await Promise.all([
  readFile(join(root, 'src', 'data.js'), 'utf8'),
  readFile(join(root, 'src', 'app.js'), 'utf8'),
  readFile(join(root, 'src', 'body.html'), 'utf8'),
])

// ключи, объявленные в PHOTO
const mapStart = data.indexOf('const PHOTO = {')
const mapEnd = data.indexOf('};', mapStart)
const mapBody = data.slice(mapStart, mapEnd)
const declared = new Set([...mapBody.matchAll(/^\s*([a-zA-Z0-9_]+):\s*'/gm)].map((m) => m[1]))

// ключи, на которые ссылается код
const used = new Map()
for (const [file, text] of [['src/data.js', data], ['src/app.js', app], ['src/body.html', body]]) {
  for (const m of text.matchAll(/PHOTO\.([a-zA-Z0-9_]+)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set())
    used.get(m[1]).add(file)
  }
}

const missing = [...used.keys()].filter((k) => !declared.has(k))
const unused = [...declared].filter((k) => !used.has(k))

console.log('объявлено фото: ' + declared.size + ' · используется ключей: ' + used.size)
if (missing.length) {
  console.log('\nОШИБКИ — ключ используется, но не объявлен:')
  missing.forEach((k) => console.log('  ✗ PHOTO.' + k + '  (' + [...used.get(k)].join(', ') + ')'))
} else {
  console.log('✓ все ссылки PHOTO.<ключ> объявлены')
}
if (unused.length) console.log('\nне используется в разметке: ' + unused.join(', '))
process.exitCode = missing.length ? 1 : 0
