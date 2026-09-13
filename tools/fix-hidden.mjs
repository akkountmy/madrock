/**
 * Скрытые панели не должны участвовать в раскладке страницы.
 * Корзина и модальные окна отрисованы за краем экрана (translateX, opacity),
 * из-за чего браузер мог считать лишнюю ширину документа; visibility: hidden
 * убирает их из потока и заодно не пускает в них фокус с клавиатуры.
 * Запуск: node tools/fix-hidden.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'src/styles.css'

const EDITS = [
  // корзина
  ['  transform: translateX(102%); transition: transform .38s var(--ease); box-shadow: var(--shadow-3);\n}\n.drawer.on { transform: none; }',
   '  transform: translateX(102%); visibility: hidden;\n  transition: transform .38s var(--ease), visibility .38s var(--ease); box-shadow: var(--shadow-3);\n}\n.drawer.on { transform: none; visibility: visible; }'],
  // модальные окна
  ['.modal { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; padding: 1rem; opacity: 0; pointer-events: none; transition: opacity .25s; }\n.modal.on { opacity: 1; pointer-events: auto; }',
   '.modal { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; padding: 1rem; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .25s, visibility .25s; }\n.modal.on { opacity: 1; visibility: visible; pointer-events: auto; }'],
]

let css = await readFile(join(root, file), 'utf8')
const problems = []
let applied = 0
for (const [from, to] of EDITS) {
  const parts = css.split(from)
  if (parts.length - 1 !== 1) { problems.push(`не найдено ровно один раз: «${from.slice(0, 60)}…»`); continue }
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
