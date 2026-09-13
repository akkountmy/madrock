/**
 * Обновление README: новые элементы интерфейса и инструменты.
 * Запуск: node tools/readme-update-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'README.md'

const EDITS = [
  ['    fix-hidden.mjs    ← скрытые панели вне потока (visibility)',
   '    fix-hidden.mjs    ← скрытые панели вне потока (visibility)\n' +
   '    apply-brand.mjs   ← перевод сайта на палитру логотипа\n' +
   '    fix-layout.mjs    ← категории без прокрутки, кнопка «наверх», фавикон\n' +
   '    fix-account.mjs   ← кабинет входа на всю ширину секции\n' +
   '    fix-hero-padding.mjs ← края героя как у остальных блоков\n' +
   '    readme-update*.mjs← правки этой документации'],
]

let text = await readFile(join(root, file), 'utf8')
const problems = []
let applied = 0
for (const [from, to] of EDITS) {
  const parts = text.split(from)
  if (parts.length - 1 !== 1) { problems.push(`не найдено ровно один раз: «${from.slice(0, 60)}…»`); continue }
  text = parts.join(to)
  applied += 1
}

const SECTION = `

## Интерфейсные правила

- **Одна ширина у всех блоков.** Шапка, все секции и подвал выровнены по краям блока
  «Акция недели»: содержимое начинается и заканчивается на тех же пикселях. Проверяется
  аудитом отдельной строкой, вместе с левым и правым краями в пикселях.
- **Категории меню без горизонтальной прокрутки** — чипы переносятся на следующую строку,
  ничего не уезжает за экран.
- **Кнопка «наверх»** — прозрачная, со стеклянным размытием, появляется после 700 px
  прокрутки и прячется вверху страницы.
- **Фавикон** — файл логотипа \`assets/brand/logo.png\`; он же используется как иконка
  при добавлении сайта на телефон.

Абзацы внутри секций сохраняют ограничение по длине строки (58–72 знака): это требование
читаемости, а не ширина блока — сами ряды и сетки идут до краёв.
`

if (text.indexOf('## Интерфейсные правила') < 0) {
  text = text.trimEnd() + '\n' + SECTION
  applied += 1
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  await writeFile(join(root, file), text, 'utf8')
  console.log(`обновлён ${file}, правок: ${applied}`)
}
