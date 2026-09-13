/**
 * Титульный блок: фотография возвращается на задний план.
 *
 * Причина оказалась не в градиенте: правило слота фото `.ph { position: relative }`
 * стоит в файле позже и с той же специфичностью, поэтому перебивало
 * `.hero__bg { position: absolute }`. Фотография оказывалась обычным блоком
 * в потоке — 953 px высотой — и весь текст уезжал ПОД неё, а не ложился на неё.
 * Лечится уточнением селектора: `.hero > .hero__bg` (два класса вместо одного).
 *
 * Запуск: node tools/fix-hero-3.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  ['src/styles.css',
    '.hero__bg { position: absolute; inset: 0; z-index: -2; }\n.hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }',
    '/* два класса в селекторе: иначе правило слота фото .ph перебивало позиционирование */\n.hero > .hero__bg { position: absolute; inset: 0; z-index: -2; }\n.hero .hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }', 1],
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
  if (found !== expected) { problems.push(`${file}: «${from.slice(0, 60)}…» — найдено ${found}`); continue }
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
