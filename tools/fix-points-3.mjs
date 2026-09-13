/**
 * Третий шаг по блоку «Наши кофейни»: убираем самую длинную строку.
 *
 * Замер: карточка ~190 px, из них три строки занимали удобства
 * («Густые милкшейки · 30+ сиропов · Десерты на витрине · Росписи на стенах»).
 * Строка переехала в подсказку при наведении — на карточке остались название,
 * часы, адрес и пояснение, а баланс колонок предзаказа выравнивается.
 *
 * Запуск: node tools/fix-points-3.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD = `      return '<article class="point-card" data-point="' + p.id + '" title="Выбрать эту кофейню для предзаказа">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<div class="point-card__feat">' + esc(p.features.join(' · ')) + '</div>' +
        '<span class="point-card__hint">Выбрать для предзаказа</span>' +
        '</article>';`

const NEW = `      return '<article class="point-card" data-point="' + p.id + '" title="' + esc(p.features.join(' · ')) + ' — выбрать для предзаказа">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<span class="point-card__hint">Выбрать для предзаказа</span>' +
        '</article>';`

const CSS_FROM = `.point-card__addr { font-size: var(--fs-sm); color: var(--cream-2); }
.point-card__note { font-size: var(--fs-xs); color: var(--muted); }
.point-card__feat { font-size: var(--fs-xs); color: var(--muted-2); }`

const CSS_TO = `.point-card__addr { font-size: var(--fs-sm); color: var(--cream-2); }
.point-card__note { font-size: var(--fs-xs); color: var(--muted); }
/* удобства кофейни показываются подсказкой при наведении: так карточка
   остаётся в две строки и колонки секции идут ровно */
.point-card__feat { display: none; }`

const EDITS = [
  ['src/app.js', OLD, NEW, 1],
  ['src/styles.css', CSS_FROM, CSS_TO, 1],
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
  if (found !== expected) { problems.push(`${file}: «${from.slice(0, 60).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
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
