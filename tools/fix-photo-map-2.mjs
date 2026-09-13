/**
 * Подключение последних двух отдельных фото: апельсиновый эспрессо и айс-ти.
 * Запуск: node tools/fix-photo-map-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'src/data.js'

const EDITS = [
  ["  teaginger:  'teaginger.jpg',\n};",
   "  teaginger:  'teaginger.jpg',\n  orangeesp:  'orangeesp.jpg',\n  icetea:     'icetea.jpg',\n};"],
  ["    desc: 'Эспрессо, апельсиновый сироп и цедра. Горько-сладкий баланс.', taste: ['апельсин', 'цитрус'], img: PHOTO.signature, tags: [] },",
   "    desc: 'Эспрессо, апельсиновый сироп и цедра. Горько-сладкий баланс.', taste: ['апельсин', 'цитрус'], img: PHOTO.orangeesp, tags: [] },"],
  ["    desc: 'Холодный чай с персиком и лимоном.', taste: ['персик', 'лёд'], img: PHOTO.lemonade, tags: ['veg'] },",
   "    desc: 'Холодный чай с персиком и лимоном.', taste: ['персик', 'лёд'], img: PHOTO.icetea, tags: ['veg'] },"],
]

let src = await readFile(join(root, file), 'utf8')
const problems = []
let applied = 0
for (const [from, to] of EDITS) {
  const parts = src.split(from)
  if (parts.length - 1 !== 1) { problems.push(`не найдено ровно один раз: «${from.slice(0, 60)}…»`); continue }
  src = parts.join(to)
  applied += 1
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  await writeFile(join(root, file), src, 'utf8')
  console.log(`применено правок: ${applied}`)
}

// контроль: в меню не должно остаться позиций с одинаковым фото
const menu = src.slice(src.indexOf('const MENU = ['), src.indexOf('const HITS'))
const items = [...menu.matchAll(/id: '([a-z0-9_]+)'[\s\S]*?name: '([^']+)'[\s\S]*?img: PHOTO\.([a-zA-Z0-9_]+)/g)]
const by = {}
items.forEach((m) => { (by[m[3]] = by[m[3]] || []).push(m[2]) })
const dupes = Object.entries(by).filter(([, v]) => v.length > 1)
console.log(dupes.length ? 'дубли: ' + dupes.map(([k, v]) => k + ' → ' + v.join(' | ')).join('; ') : 'у каждой из ' + items.length + ' позиций своё фото')
