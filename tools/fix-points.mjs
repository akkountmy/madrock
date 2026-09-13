/**
 * Блок «Наши кофейни»: компактные карточки в две колонки.
 *
 * Раньше пять карточек шли в один столбец, из-за чего правый столбец секции
 * предзаказа был вдвое выше левого, и сайт приходилось прокручивать, хотя слева
 * оставалось свободное место. Теперь карточки компактнее и раскладываются
 * в две колонки, а пятая занимает всю ширину, чтобы не оставалось сироты.
 *
 * Запуск: node tools/fix-points.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD_POINTS = `    $('#points').innerHTML = SHOP.points.map(function (p) {
      return '<div class="tile" style="background:var(--surface)"><div class="between"><div class="tile__t">' + esc(p.name) + '</div>' +
        '<span class="small accent nowrap">' + esc(p.hours) + '</span></div>' +
        '<div class="tile__d">' + esc(p.address) + ' · ' + esc(p.note) + '</div>' +
        '<div class="row" style="margin-top:.8rem">' + p.features.map(function (fs) { return '<span class="badge">' + esc(fs) + '</span>'; }).join('') + '</div></div>';
    }).join('');`

const NEW_POINTS = `    $('#points').innerHTML = SHOP.points.map(function (p) {
      return '<article class="point-card">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<div class="point-card__feat">' + esc(p.features.join(' · ')) + '</div>' +
        '<button class="point-card__pick" type="button" data-point="' + p.id + '">Выбрать для предзаказа</button>' +
        '</article>';
    }).join('');`

const CSS = `
/* --- кофейни в предзаказе: компактная сетка ------------------------------- */
.points-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
.point-card {
  display: grid; gap: .3rem; align-content: start;
  padding: .85rem .95rem; border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--surface); transition: border-color .2s, transform .2s var(--ease);
}
.point-card:hover { border-color: var(--line-2); transform: translateY(-2px); }
.point-card__head { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.point-card__head b { font-family: var(--font-display); font-size: .98rem; }
.point-card__head span { font-size: var(--fs-xs); font-weight: 700; color: var(--amber); white-space: nowrap; font-variant-numeric: tabular-nums; }
.point-card__addr { font-size: var(--fs-sm); color: var(--cream-2); }
.point-card__note { font-size: var(--fs-xs); color: var(--muted); }
.point-card__feat { font-size: var(--fs-xs); color: var(--muted-2); }
.point-card__pick {
  justify-self: start; margin-top: .25rem; padding: .38rem .8rem; border-radius: var(--r-pill);
  border: 1px solid var(--line-2); background: transparent; color: var(--cream);
  font-size: .78rem; font-weight: 700; transition: all .2s;
}
.point-card__pick:hover { border-color: var(--amber); color: var(--amber); background: rgba(var(--accent-rgb), .1); }
/* пятая карточка занимает обе колонки — иначе в последнем ряду остаётся пустое место */
.points-grid > .point-card:last-child:nth-child(odd) { grid-column: span 2; }
@media (max-width: 620px) { .points-grid { grid-template-columns: 1fr; } .points-grid > .point-card:last-child:nth-child(odd) { grid-column: auto; } }
`

const cache = new Map()
const load = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(join(root, file), 'utf8'))
  return cache.get(file)
}

const problems = []
let applied = 0
const EDITS = [
  ['src/app.js', OLD_POINTS, NEW_POINTS, 1],
  ['src/body.html', '<div class="stack" id="points"></div>', '<div class="points-grid" id="points"></div>', 1],
]
for (const [file, from, to, expected] of EDITS) {
  const text = await load(file)
  const parts = text.split(from)
  const found = parts.length - 1
  if (found !== expected) { problems.push(`${file}: «${from.slice(0, 60).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('кофейни в предзаказе: компактная сетка') < 0) {
  cache.set('src/styles.css', css.trimEnd() + '\n' + CSS)
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
