/**
 * Правки после аудита вёрстки:
 *   1. бейдж «Хит» ровно у тех 6 позиций, что показаны в блоке «Хиты бара»,
 *      иначе фильтр «только хиты» расходится с витриной (было 8 против 6);
 *   2. страховка от горизонтальной прокрутки на узких экранах.
 * Запуск: node tools/fix-audit.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  // «Латте» и «Сэндвич с курицей» остаются в меню, но без бейджа «Хит»:
  // витрина «Хиты бара» показывает ровно 6 позиций.
  ['src/data.js', "img: PHOTO.latte, tags: ['hit'] },", "img: PHOTO.latte, tags: [] },", 1],
  ['src/data.js', "img: PHOTO.sandwich, tags: ['hit'] },", "img: PHOTO.sandwich, tags: [] },", 1],
]

const CSS_ADD = `
/* --- устойчивость к горизонтальной прокрутке ------------------------------
   Бегущая строка шире экрана по своей природе: она обрезается контейнером,
   но на узких экранах браузер всё равно считал лишнюю ширину у документа. */
html { overflow-x: clip; }
.ticker { max-width: 100%; contain: paint; }
.ticker__row { will-change: transform; }
`

const cache = new Map()
const load = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(join(root, file), 'utf8'))
  return cache.get(file)
}

const problems = []
let applied = 0
for (const [file, from, to, expected] of EDITS) {
  const text = await load(file)
  const parts = text.split(from)
  const found = parts.length - 1
  if (found !== expected) {
    problems.push(`${file}: «${from.slice(0, 60)}» — найдено ${found}, ожидалось ${expected}`)
    continue
  }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('устойчивость к горизонтальной прокрутке') < 0) {
  cache.set('src/styles.css', css.trimEnd() + '\n' + CSS_ADD)
  applied += 1
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  for (const [file, text] of cache) await writeFile(join(root, file), text, 'utf8')
  console.log(`применено правок: ${applied}`)
  for (const [file] of cache) console.log('  ✓ ' + file)
}
