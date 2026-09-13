/**
 * Правка текстов MADROCK: «точки» → «кофейни/кофеен» и чистка шапки.
 *
 * Скрипт проверяет каждую замену: если строка не найдена или встречается
 * не там, где ожидалось, он сообщает об этом и завершается с ошибкой.
 * Запуск: node tools/fix-copy.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** [файл, что искать, на что заменить, сколько раз ожидаем] */
const EDITS = [
  // --- src/app.js ---
  ['src/app.js', "'обе точки'", "'обе кофейни'", 1],
  ['src/app.js', "SHOP.points.length + ' точек в Гомеле", "SHOP.points.length + ' кофеен в Гомеле", 1],
  ['src/app.js', "'Пять точек в Гомеле'", "'Пять кофеен в Гомеле'", 1],
  ['src/app.js', 'выбираете точку и время', 'выбираете кофейню и время', 1],
  ['src/app.js', "t: 'Пять точек'", "t: 'Пять кофеен'", 1],
  ['src/app.js', 'Выбрать эту точку для предзаказа', 'Выбрать эту кофейню для предзаказа', 1],
  ['src/app.js', 'Оплата на точке или онлайн', 'Оплата в кофейне или онлайн', 1],
  ['src/app.js', 'Дальше: точка и время', 'Дальше: кофейня и время', 1],
  ['src/app.js', '<b>Картой на точке</b>', '<b>Картой в кофейне</b>', 1],

  // --- src/body.html ---
  ['src/body.html', '5 точек в Гомеле', '5 кофеен в Гомеле', 1],
  ['src/body.html', 'Пять точек, один характер', 'Пять кофеен, один характер', 1],
  ['src/body.html', 'выросли в пять точек по Гомелю', 'выросли в пять кофеен', 1],
  ['src/body.html', 'актуальные уточняйте на точке', 'актуальные уточняйте в кофейне', 1],
  ['src/body.html', 'выберите точку и время', 'выберите кофейню и время', 1],
  ['src/body.html', 'оплатить остаток картой на точке', 'оплатить остаток картой в кофейне', 1],
  ['src/body.html', '<h3 class="h3" style="margin-bottom:1rem">Наши точки</h3>', '<h3 class="h3" style="margin-bottom:1rem">Наши кофейни</h3>', 1],
  ['src/body.html', '<a href="#contacts">Контакты и точки</a>', '<a href="#contacts">Контакты и кофейни</a>', 1],
  ['src/body.html', '<div class="ftr__t">Точки</div>', '<div class="ftr__t">Кофейни</div>', 1],
  ['src/body.html', '<span class="steps__i"><b>2</b> Точка и время</span>', '<span class="steps__i"><b>2</b> Кофейня и время</span>', 1],
  // лишняя текстовая ссылка «Личный кабинет» в шапке: кабинет открывается иконкой
  ['src/body.html', '\n      <a href="#account">Личный кабинет</a>', '', 1],

  // --- src/data.js ---
  ['src/data.js', '/* --- точки ---', '/* --- кофейни ---', 1],
  ['src/data.js', "features: ['Тихая точка для работы'", "features: ['Тихое место для работы'", 1],
  ['src/data.js', 'Работает во всех точках и в предзаказе.', 'Работает во всех кофейнях и в предзаказе.', 1],
  ['src/data.js', "'Во всех точках'", "'Во всех кофейнях'", 1],
  ['src/data.js', "l: 'точек в Гомеле'", "l: 'кофеен в Гомеле'", 1],

  // --- tools/render-check.mjs ---
  ['tools/render-check.mjs', 'ok(`точки: ${D.SHOP.points.map((p) => p.name).join(\' · \')}`)',
    'ok(`кофейни: ${D.SHOP.points.map((p) => p.name).join(\' · \')}`)', 1],

  // --- README.md ---
  ['README.md', 'контакты пяти точек, футер', 'контакты пяти кофеен, футер', 1],
  ['README.md', '| Адреса, часы, телефон, соцсети | `SHOP` |', '| Кофейни: адреса, часы, телефон, соцсети | `SHOP` |', 1],
  ['README.md', 'подтвердить часы работы, подставить реквизиты', 'подтвердить часы работы каждой кофейни, подставить реквизиты', 1],
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
  if (found !== expected) {
    problems.push(`${file}: «${from.slice(0, 60)}» — найдено ${found}, ожидалось ${expected}`)
    continue
  }
  cache.set(file, parts.join(to))
  applied += 1
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ, есть расхождения:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  for (const [file, text] of cache) await writeFile(join(root, file), text, 'utf8')
  console.log(`применено правок: ${applied} в ${cache.size} файлах`)
  for (const [file] of cache) console.log('  ✓ ' + file)
}
