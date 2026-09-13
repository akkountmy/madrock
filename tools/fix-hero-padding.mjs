/**
 * Выравнивание героя по краям остальных блоков.
 *
 * Причина расхождения: у .wrap заданы боковые отступы, но правило .hero__in
 * переписывало padding целиком и обнуляло их — содержимое героя выезжало на
 * 32 px левее блока «акция недели». Теперь задаётся только вертикальный отступ.
 *
 * Запуск: node tools/fix-hero-padding.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'src/styles.css'

const EDITS = [
  ['.hero__in { padding: clamp(3rem, 9vw, 7rem) 0 clamp(2.4rem, 6vw, 4.4rem); }',
   '.hero__in { padding-block: clamp(3rem, 9vw, 7rem) clamp(2.4rem, 6vw, 4.4rem); }'],
]

let css = await readFile(join(root, file), 'utf8')
const problems = []
let applied = 0
for (const [from, to] of EDITS) {
  const parts = css.split(from)
  if (parts.length - 1 !== 1) { problems.push(`не найдено ровно один раз: «${from.slice(0, 70)}»`); continue }
  css = parts.join(to)
  applied += 1
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  await writeFile(join(root, file), css, 'utf8')
  console.log(`применено правок: ${applied} в ${file}`)
}
