/* Полный текст GNU FDL 1.2 — его требует лицензия двух кадров (cocoa, croissant).
   Кладём рядом с сайтом и публикуем вместе с ним. Запуск: node tools/fetch-licence.mjs */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'assets', 'licenses')
await mkdir(dir, { recursive: true })

const url = 'https://www.gnu.org/licenses/old-licenses/fdl-1.2.txt'
const res = await fetch(url, { headers: { 'user-agent': 'madrock-site' } })
if (!res.ok) throw new Error('не удалось скачать текст лицензии: ' + res.status)
const text = await res.text()
if (text.length < 20000 || text.indexOf('GNU Free Documentation License') < 0) {
  throw new Error('скачался не тот текст: ' + text.length + ' символов')
}
const out = join(dir, 'GFDL-1.2.txt')
await writeFile(out, 'Источник текста: ' + url + '\n\n' + text, 'utf8')
console.log('лицензия сохранена: assets/licenses/GFDL-1.2.txt — ' + Math.round((await stat(out)).size / 1024) + ' КБ')
