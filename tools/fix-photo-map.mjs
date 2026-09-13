/**
 * Подключение отдельных фото к позициям, которые раньше делили картинку:
 * доппио, лавандовый раф, мокко-орех и имбирный чай получают свои снимки.
 * Запуск: node tools/fix-photo-map.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'src/data.js'

const EDITS = [
  ["  eclair:     'eclair.jpg',\n};",
   "  eclair:     'eclair.jpg',\n  doppio:     'doppio.jpg',\n  lavraf:     'lavraf.jpg',\n  nutmocha:   'nutmocha.jpg',\n  teaginger:  'teaginger.jpg',\n};"],

  ["    desc: 'Двойной шот для тех, кому одного мало. Тот же характер, вдвое громче.', taste: ['крепко', 'шоколад'], img: PHOTO.espresso, tags: [] },",
   "    desc: 'Двойной шот для тех, кому одного мало. Тот же характер, вдвое громче.', taste: ['крепко', 'шоколад'], img: PHOTO.doppio, tags: [] },"],

  ["    desc: 'Сливки, лавандовый сироп и эспрессо. Тёплый и немного парфюмерный.', taste: ['лаванда', 'сливки'], img: PHOTO.raf, tags: ['new'] },",
   "    desc: 'Сливки, лавандовый сироп и эспрессо. Тёплый и немного парфюмерный.', taste: ['лаванда', 'сливки'], img: PHOTO.lavraf, tags: ['new'] },"],

  ["    desc: 'Шоколад, лесной орех, эспрессо и молоко.', taste: ['орех', 'шоколад'], img: PHOTO.mocha, tags: [] },",
   "    desc: 'Шоколад, лесной орех, эспрессо и молоко.', taste: ['орех', 'шоколад'], img: PHOTO.nutmocha, tags: [] },"],

  ["    desc: 'Имбирь, лимон и мёд. Спасает в ноябре.', taste: ['имбирь', 'мёд'], img: PHOTO.tea, tags: ['veg'] },",
   "    desc: 'Имбирь, лимон и мёд. Спасает в ноябре.', taste: ['имбирь', 'мёд'], img: PHOTO.teaginger, tags: ['veg'] },"],
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
  console.log(`применено правок: ${applied} в ${file}`)
}

/* дубли фото в меню: одна картинка на две позиции — это уже несоответствие */
const menu = src.slice(src.indexOf('const MENU = ['))
const used = {}
for (const m of menu.matchAll(/img: PHOTO\.([a-zA-Z0-9_]+)/g)) used[m[1]] = (used[m[1]] || 0) + 1
const dupes = Object.entries(used).filter(([, n]) => n > 1)
console.log(dupes.length ? 'дубли фото в меню: ' + dupes.map(([k, n]) => k + '×' + n).join(', ') : 'дублей фото в меню нет')
