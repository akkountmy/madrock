/**
 * Чистка кода после удаления бейджей титульного блока.
 *
 * Проверка целостности справедливо указала: скрипты продолжали искать
 * #hero-promo и #hero-live, которых больше нет. Обращения были закрыты
 * проверкой, но мёртвый код лучше убрать совсем.
 *
 * Запуск: node tools/fix-hero-badges-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  // в акции недели название больше не дублируется в шапке-бейдже
  ['src/app.js',
    "    var heroPromo = $('#hero-promo');\n    if (heroPromo) heroPromo.textContent = p.title + ' — ' + p.highlight;\n\n",
    ''],

  // статус работы обновляет только шапка
  ['src/app.js',
    `    var el = $('#status'), txt = $('#status-txt'), live = $('#hero-live');
    if (s.any) {
      var p = s.open[0];
      el.className = 'status';
      txt.textContent = 'Открыто до ' + p.hours.split('–')[1].trim();
      if (live) { live.className = 'badge badge--live'; live.textContent = 'Открыто · ' + (s.open.length > 1 ? 'обе кофейни' : p.name); }
      // в титульном блоке бейджа больше нет — обновляем только шапку
    } else {
      el.className = 'status closed';
      txt.textContent = 'Закрыто';
      if (live) { live.className = 'badge'; live.textContent = 'Откроемся в 08:00'; }
    }`,
    `    var el = $('#status'), txt = $('#status-txt');
    if (s.any) {
      var open = s.open[0];
      el.className = 'status';
      txt.textContent = (s.open.length > 1 ? 'Открыто · обе кофейни' : 'Открыто · ' + open.name) + ' до ' + open.hours.split('–')[1].trim();
    } else {
      el.className = 'status closed';
      txt.textContent = 'Закрыто · откроемся в 07:30';
    }`],
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
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 56).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
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
