/**
 * Второй шаг по блоку «Наши кофейни»: карточки ещё компактнее.
 *
 * Замер показал 761 px справа против 435 px слева: каждая карточка занимала
 * около 200 px из-за кнопки «Выбрать». Кнопку убрал — выбор кофейни теперь по
 * клику на саму карточку (обработчик data-point уже существует), а отступы
 * и строки поджаты. Цель — ровные колонки предзаказа.
 *
 * Запуск: node tools/fix-points-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD = `      return '<article class="point-card">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<div class="point-card__feat">' + esc(p.features.join(' · ')) + '</div>' +
        '<button class="point-card__pick" type="button" data-point="' + p.id + '">Выбрать для предзаказа</button>' +
        '</article>';`

const NEW = `      return '<article class="point-card" data-point="' + p.id + '" title="Выбрать эту кофейню для предзаказа">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<div class="point-card__feat">' + esc(p.features.join(' · ')) + '</div>' +
        '<span class="point-card__hint">Выбрать для предзаказа</span>' +
        '</article>';`

const CSS_FROM = `.point-card {
  display: grid; gap: .3rem; align-content: start;
  padding: .85rem .95rem; border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--surface); transition: border-color .2s, transform .2s var(--ease);
}
.point-card:hover { border-color: var(--line-2); transform: translateY(-2px); }`

const CSS_TO = `.point-card {
  display: grid; gap: .18rem; align-content: start; cursor: pointer;
  padding: .7rem .8rem; border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--surface); transition: border-color .2s, transform .2s var(--ease);
}
.point-card:hover { border-color: var(--amber); transform: translateY(-2px); }
.point-card__hint {
  margin-top: .3rem; font-size: .72rem; font-weight: 700; letter-spacing: .04em;
  color: var(--muted-2); transition: color .2s;
}
.point-card:hover .point-card__hint { color: var(--amber); }`

const EDITS = [
  ['src/app.js', OLD, NEW, 1],
  ['src/styles.css', CSS_FROM, CSS_TO, 1],
  // старый стиль кнопки больше не нужен
  ['src/styles.css',
    '.point-card__pick {\n  justify-self: start; margin-top: .25rem; padding: .38rem .8rem; border-radius: var(--r-pill);\n  border: 1px solid var(--line-2); background: transparent; color: var(--cream);\n  font-size: .78rem; font-weight: 700; transition: all .2s;\n}\n.point-card__pick:hover { border-color: var(--amber); color: var(--amber); background: rgba(var(--accent-rgb), .1); }\n', '', 1],
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
