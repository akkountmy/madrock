/**
 * Убрать строку бейджей из титульного блока.
 *
 * Четыре бейджа («акция недели», «открыто», «5 кофеен», «30+ сиропов») уходят
 * с домашней страницы. Важно: два из них обновлялись скриптом — обращение к
 * удалённым элементам сломало бы страницу, поэтому оба места закрыты проверкой.
 * Информация не теряется: статус работы остаётся в шапке, а акция недели —
 * в одноимённом блоке ниже.
 *
 * Запуск: node tools/fix-hero-badges.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BADGES = `      <div class="hero__badges">
        <span class="badge badge--hot">🔥 Акция недели: <b id="hero-promo">Второй капучино за 1 рубль</b></span>
        <span class="badge badge--live" id="hero-live">Открыто до 23:00</span>
        <span class="badge">5 кофеен в Гомеле</span>
        <span class="badge">30+ сиропов</span>
      </div>
`

const EDITS = [
  // 1. разметка: строки бейджей больше нет
  ['src/body.html', BADGES, ''],

  // 2. скрипт акции больше не ищет удалённый бейдж
  ['src/app.js',
    "    $('#hero-promo').textContent = p.title + ' — ' + p.highlight;",
    "    var heroPromo = $('#hero-promo');\n    if (heroPromo) heroPromo.textContent = p.title + ' — ' + p.highlight;"],

  // 3. статус «открыто» в шапке остаётся, бейдж в герое — уже нет
  ['src/app.js',
    "      if (live) { live.className = 'badge badge--live'; live.textContent = 'Открыто · ' + (s.open.length > 1 ? 'обе кофейни' : p.name); }",
    "      if (live) { live.className = 'badge badge--live'; live.textContent = 'Открыто · ' + (s.open.length > 1 ? 'обе кофейни' : p.name); }\n      // в титульном блоке бейджа больше нет — обновляем только шапку"],
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
