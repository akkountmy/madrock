/**
 * Бейджи в титульном блоке — в одну строку.
 *
 * Ограничение ширины (46rem), которое я поставил текстовому столбцу ради
 * читаемости на фотографии, задевало и ряд бейджей: четвёртый («30+ сиропов»)
 * переносился на вторую строку, хотя места в блоке хватает. Теперь ряд бейджей
 * идёт на всю ширину, а каждый бейдж не разрывается внутри себя. Перенос
 * остаётся как запасной вариант для узких экранов.
 *
 * Запуск: node tools/fix-badges.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  ['src/styles.css',
    '/* текст держим в затемнённой половине, чтобы справа было видно снимок */\n.hero__badges, .hero__title, .hero__sub, .hero__cta { max-width: min(100%, 46rem); }',
    '/* текст держим в затемнённой половине, чтобы справа было видно снимок;\n   ряд бейджей исключение — он идёт во всю ширину, чтобы все четыре встали\n   в одну строку */\n.hero__title, .hero__sub, .hero__cta { max-width: min(100%, 46rem); }\n.hero__badges { max-width: none; }'],
  ['src/styles.css',
    '.badge {\n  display: inline-flex; align-items: center; gap: .4rem; padding: .38rem .78rem;',
    '.badge {\n  display: inline-flex; align-items: center; gap: .4rem; padding: .38rem .78rem; white-space: nowrap;'],
]

const cache = new Map()
const load = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(join(root, file), 'utf8'))
  return cache.get(file)
}

const problems = []
let applied = 0
for (const [file, from, to] of EDITS) {
  const text = await load(file)
  const parts = text.split(from)
  const found = parts.length - 1
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 60).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
  cache.set(file, parts.join(to))
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
