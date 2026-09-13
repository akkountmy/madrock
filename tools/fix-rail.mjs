/**
 * Категории меню: короткие подписи на чипах, чтобы ряд укладывался в одну
 * строку на широком экране и переносился аккуратно на узком.
 * Полное название категории по-прежнему видно в подписи «N позиций · …»
 * и в подвале.
 * Запуск: node tools/fix-rail.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  // короткие подписи в данных
  ['src/data.js',
    "  { id: 'coffee',    name: 'Кофе по-итальянски', ico: '☕', note: 'Эспрессо-машина и итальянская смесь' },\n" +
    "  { id: 'author',    name: 'Авторские и сиропы', ico: '🔥', note: '30+ сиропов на баре' },\n" +
    "  { id: 'cold',      name: 'Холодные и коктейли', ico: '🥤', note: 'Густые милкшейки, фраппе, лимонады' },\n" +
    "  { id: 'notcoffee', name: 'Не кофе', ico: '🍫', note: 'Какао, горячий шоколад, чай, глинтвейн' },\n" +
    "  { id: 'food',      name: 'Кухня', ico: '🥪', note: 'Сэндвичи, панини, хот-доги, шаурма' },\n" +
    "  { id: 'dessert',   name: 'Десерты', ico: '🍰', note: 'От городских кондитеров' },",
    "  { id: 'coffee',    name: 'Кофе по-итальянски', short: 'Кофе', ico: '☕', note: 'Эспрессо-машина и итальянская смесь' },\n" +
    "  { id: 'author',    name: 'Авторские и сиропы', short: 'Авторские', ico: '🔥', note: '30+ сиропов на баре' },\n" +
    "  { id: 'cold',      name: 'Холодные и коктейли', short: 'Холодные', ico: '🥤', note: 'Густые милкшейки, фраппе, лимонады' },\n" +
    "  { id: 'notcoffee', name: 'Не кофе', short: 'Не кофе', ico: '🍫', note: 'Какао, горячий шоколад, чай, глинтвейн' },\n" +
    "  { id: 'food',      name: 'Кухня', short: 'Кухня', ico: '🥪', note: 'Сэндвичи, панини, хот-доги, шаурма' },\n" +
    "  { id: 'dessert',   name: 'Десерты', short: 'Десерты', ico: '🍰', note: 'От городских кондитеров' },", 1],

  // чип использует короткую подпись
  ['src/app.js',
    "          c.ico + ' ' + esc(c.name) + '<span>' + (counts[c.id] || 0) + '</span></button>';",
    "          c.ico + ' ' + esc(c.short || c.name) + '<span>' + (counts[c.id] || 0) + '</span></button>';", 1],

  // сам ряд: чипы одной высоты, аккуратные отступы, по центру при переносе
  ['src/styles.css',
    '.rail { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.6rem; }',
    '.rail { display: flex; flex-wrap: wrap; gap: .5rem .45rem; margin-bottom: 1.6rem; align-items: center; }', 1],
  ['src/styles.css',
    '  padding: .6rem 1.05rem; border-radius: var(--r-pill); border: 1px solid var(--line);',
    '  padding: .55rem .9rem; border-radius: var(--r-pill); border: 1px solid var(--line);', 1],
  ['src/styles.css',
    '  background: var(--surface); font-size: .88rem; font-weight: 600; color: var(--cream-2);',
    '  background: var(--surface); font-size: .86rem; font-weight: 600; color: var(--cream-2);', 1],
]

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
    problems.push(`${file}: «${from.slice(0, 64).replace(/\n/g, '⏎')}…» — найдено ${found}`)
    continue
  }
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
