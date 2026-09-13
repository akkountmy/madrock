/**
 * Бегущая строка под шапкой: отступ слева и мягкие края.
 *
 * Замер показал: первый элемент строки («Итальянский кофе») стоял на 0 px —
 * ровно у края экрана, и надпись выглядела обрезанной. Теперь у строки есть
 * боковые отступы, а по краям добавлено растворение: текст уходит в прозрачность,
 * а не режется по границе.
 *
 * Запуск: node tools/fix-ticker.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const FROM = `.ticker { border-block: 1px solid var(--line); background: var(--ink-2); overflow: hidden; padding: .7rem 0; position: relative; z-index: 1; }`

const TO = `/* боковые отступы: первый элемент строки стоит с отступом, а не вплотную
   к краю экрана; маска по краям растворяет текст вместо жёсткого обреза */
.ticker {
  border-block: 1px solid var(--line); background: var(--ink-2); overflow: hidden;
  padding: .7rem clamp(1rem, 4vw, 2rem); position: relative; z-index: 1;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
}`

const EDITS = [['src/styles.css', FROM, TO]]

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
  if (found !== 1) { problems.push(`${file}: правило бегущей строки не найдено (${found})`); continue }
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
