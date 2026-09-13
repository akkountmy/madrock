/**
 * Проверка рендера MADROCK без браузера.
 *
 * Проверяет то, что обычно ломается в одностраничной сборке:
 *   1. сборка собрана и в ней не осталось плейсхолдеров;
 *   2. data.js и app.js компилируются как корректный JavaScript;
 *   3. данные меню/акций/уровней внутренне согласованы;
 *   4. каждый id, к которому обращается app.js, есть в разметке;
 *   5. каждый data-*-атрибут, который читает app.js, где-то создаётся;
 *   6. классы, которыми app.js наполняет страницу, описаны в styles.css.
 */
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const notes = []
const fail = (m) => problems.push(m)
const ok = (m) => notes.push(m)

const [html, dataJs, appJs, css, body] = await Promise.all([
  readFile(join(root, 'index.html'), 'utf8'),
  readFile(join(root, 'src', 'data.js'), 'utf8'),
  readFile(join(root, 'src', 'app.js'), 'utf8'),
  readFile(join(root, 'src', 'styles.css'), 'utf8'),
  readFile(join(root, 'src', 'body.html'), 'utf8'),
])

/* 1. сборка */
if (html.includes('<!--{{')) fail('в index.html остались незаменённые плейсхолдеры')
else ok('плейсхолдеры сборки заменены')
if (!html.startsWith('<!doctype html>')) fail('index.html без doctype')
if (!/<style>[\s\S]{2000,}<\/style>/.test(html)) fail('в index.html не встроен CSS')
if (!/<script>[\s\S]{2000,}<\/script>/.test(html)) fail('в index.html не встроен JS')
ok(`размер сборки ${(Buffer.byteLength(html) / 1024).toFixed(1)} КБ`)

/* 2. синтаксис */
const compile = (code, label) => {
  try { new vm.Script(code, { filename: label }); return true } catch (e) { fail(`${label}: синтаксис — ${e.message}`); return false }
}
const dataOk = compile(dataJs, 'data.js')
compile(appJs, 'app.js')

/* 3. данные */
let D = null
if (dataOk) {
  try {
    D = vm.runInNewContext(
      dataJs + '\n;({SHOP,CATEGORIES,MENU,HITS,PROMOS,TIERS,MODS,REVIEWS,GALLERY,FACTS,PHOTO,SEED_COUPONS})',
      {}, { filename: 'data.js' },
    )
  } catch (e) { fail(`data.js не выполняется: ${e.message}`) }
}

if (D) {
  const ids = new Set()
  const need = new Set()
  D.MENU.forEach((it) => {
    if (ids.has(it.id)) fail(`дубль id позиции меню: ${it.id}`)
    ids.add(it.id)
    if (!D.CATEGORIES.some((c) => c.id === it.cat)) fail(`позиция ${it.id}: неизвестная категория ${it.cat}`)
    if (!(it.price > 0)) fail(`позиция ${it.id}: цена не положительная`)
    if (!it.img) fail(`позиция ${it.id}: не указано фото`)
    else if (!/^[a-z0-9_.-]+$/.test(it.img)) fail(`позиция ${it.id}: фото должно быть локальным файлом`)
    else need.add(it.img)
    if (!it.desc || it.desc.length < 20) fail(`позиция ${it.id}: слишком короткое описание`)
    if (!(it.taste || []).length) fail(`позиция ${it.id}: нет чипсов вкуса`)
  })
  ok(`меню: ${D.MENU.length} позиций, ${D.CATEGORIES.length} категорий`)

  // каждое фото из данных должно лежать в assets/ во всех своих вариантах:
  // 400 и 800 px в WebP и JPEG (у главного фото ещё 1280) — именно из них
  // браузер выбирает файл под размер экрана
  Object.values(D.PHOTO).forEach((f) => need.add(f))
  D.GALLERY.forEach((g) => need.add(g.img))
  const missing = []
  let variants = 0
  for (const file of need) {
    const base = String(file).replace(/\.jpe?g$/i, '')
    const widths = base === 'hero' ? [400, 800, 1280] : [400, 800]
    for (const ext of ['webp', 'jpg']) {
      for (const w of widths) {
        const name = `${base}-${w}.${ext}`
        variants += 1
        try {
          const info = await stat(join(root, 'assets', name))
          if (info.size < 1200) missing.push(name + ' (подозрительно мал)')
        } catch (e) { missing.push(name) }
      }
    }
  }
  if (missing.length) fail(`нет файлов фото в assets/: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` и ещё ${missing.length - 12}` : ''}`)
  else ok(`фото на диске: ${need.size} кадров, ${variants} вариантов (400/800 в WebP и JPEG, у героя ещё 1280)`)

  /* Главное фото прописано в разметке статично — проверяем, что имя совпадает
     с данными: иначе на первом экране окажется битая картинка. */
  const heroBase = String(D.PHOTO.hero).replace(/\.jpe?g$/i, '')
  if (!body.includes(`assets/${heroBase}-1280.webp`)) {
    fail(`в body.html главное фото не указывает на assets/${heroBase}-1280.webp (PHOTO.hero = ${D.PHOTO.hero})`)
  } else ok(`главное фото в разметке совпадает с PHOTO.hero (${D.PHOTO.hero})`)

  D.HITS.forEach((h) => { if (!ids.has(h)) fail(`хит ${h} отсутствует в меню`) })
  D.PROMOS.forEach((p) => {
    if (!ids.has(p.item)) fail(`акция ${p.id}: позиция ${p.item} отсутствует в меню`)
    if (!(p.promoPrice < p.price)) fail(`акция ${p.id}: акционная цена не ниже обычной`)
    if (!p.conditions || !p.conditions.length) fail(`акция ${p.id}: нет условий`)
  })
  ok(`акции недели: ${D.PROMOS.length} в ротации`)

  const from = D.TIERS.map((t) => t.from)
  if (from.some((v, i) => i && v <= from[i - 1])) fail('уровни лояльности идут не по возрастанию порога')
  const cb = D.TIERS.map((t) => t.cashback)
  if (cb.some((v, i) => i && v <= cb[i - 1])) fail('кэшбэк уровней не растёт')
  ok(`уровни: ${D.TIERS.map((t) => `${t.name} ${t.cashback}%`).join(' · ')}`)

  if (D.SHOP.points.length < 2) fail('меньше двух точек — предзаказ негде выбирать')
  D.SHOP.points.forEach((p) => {
    if (!(p.open < p.close)) fail(`точка ${p.id}: некорректные часы работы`)
    if (!p.address) fail(`точка ${p.id}: нет адреса`)
  })
  if (!/^\+375/.test(D.SHOP.phone)) fail('телефон не в формате +375')
  ok(`кофейни: ${D.SHOP.points.map((p) => p.name).join(' · ')}`)
  ok(`галерея: ${D.GALLERY.length} фото · отзывы: ${D.REVIEWS.length}`)
}

/* 4. id из разметки против обращений в app.js
      (часть узлов app.js создаёт сам — их id тоже считаем существующими) */
const bodyIds = new Set([...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
const jsIds = new Set([...appJs.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]))
const usedIds = new Set([...appJs.matchAll(/\$\('#([A-Za-z0-9_-]+)'/g)].map((m) => m[1]))
const missingIds = [...usedIds].filter((id) => !bodyIds.has(id) && !jsIds.has(id))
if (missingIds.length) fail(`app.js обращается к отсутствующим id: ${missingIds.join(', ')}`)
else ok(`${usedIds.size} id из app.js присутствуют (${bodyIds.size} в разметке, ${jsIds.size} создаёт JS)`)

/* 5. data-атрибуты: читаются в app.js — должны где-то создаваться */
const readAttrs = new Set([...appJs.matchAll(/getAttribute\('(data-[a-z-]+)'\)/g)].map((m) => m[1]))
const created = appJs + body
const missingAttrs = [...readAttrs].filter((a) => !created.includes(a + '="') && !created.includes(a + "='"))
if (missingAttrs.length) fail(`app.js читает атрибуты, которых никто не создаёт: ${missingAttrs.join(', ')}`)
else ok(`${readAttrs.size} data-атрибутов читаются и создаются согласованно`)

/* 6. классы, которые шаблоны пишут в разметку, должны быть в CSS.
      Из строк вида class="a b ' + x + '" берём только литеральную часть до первой кавычки. */
const cssClasses = new Set([...css.matchAll(/\.([a-z][a-z0-9_-]+)/g)].map((m) => m[1]))
const appClasses = new Set([...appJs.matchAll(/class="([^"]*)"/g)]
  .flatMap((m) => m[1].split("'")[0].split(/\s+/))
  .filter((c) => /^[a-z][a-z0-9]*(?:__?[a-z0-9]+)*(?:--[a-z0-9]+)?$/.test(c)))
const missingCss = [...appClasses].filter((c) => !cssClasses.has(c))
if (missingCss.length) fail(`классы без стилей в styles.css: ${missingCss.join(', ')}`)
else ok(`${appClasses.size} классов из шаблонов описаны в CSS`)

/* 7. бегущая строка должна бежать внутри обычных полей сайта: её обрезает тот же
      контейнер .wrap, что задаёт края секций, — иначе надписи вроде
      «10-й напиток в подарок» уезжают за поля блоков */
const tickerBefore = problems.length
if (!/<div class="ticker"[^>]*>\s*<div class="wrap">\s*<div class="ticker__row"/.test(html)) {
  fail('бегущая строка не обёрнута в .wrap — её края разойдутся с краями блоков сайта')
}
const tickerWrap = css.match(/\.ticker\s+\.wrap\s*\{([^}]*)\}/)
if (tickerWrap === null) fail('нет правила .ticker .wrap — строка не ограничена полями сайта')
else {
  if (!/overflow\s*:\s*hidden/.test(tickerWrap[1])) fail('.ticker .wrap не обрезает строку по полям')
  if (!/mask-image/.test(tickerWrap[1])) fail('.ticker .wrap без маски — край строки обрывается резко')
}
const tickerBox = css.match(/\.ticker\s*\{([^}]*)\}/)
if (tickerBox !== null && /padding\s*:\s*[^;]*clamp/.test(tickerBox[1])) {
  fail('у .ticker свои боковые отступы — строка разойдётся с полями блоков')
}
if (!/\.ticker\s+\.wrap\s*\{[^}]*overflow\s*:\s*visible/.test(css)) {
  fail('на телефоне строка должна показываться целиком: .ticker .wrap → overflow: visible')
}
if (problems.length === tickerBefore) ok('бегущая строка ограничена теми же полями, что и блоки сайта')

/* 8. адаптивные фото: каждый слот обязан получить параметр sizes, иначе браузер
      считает слот шириной во весь экран и берёт самый крупный вариант. У
      главного фото набор вариантов прописан прямо в разметке — оно должно
      грузиться сразу (без loading="lazy") и с приоритетом. */
const phCalls = appJs.split('\n').filter((l) => /\bph\(/.test(l) && !/var ph = function/.test(l))
const noSizes = phCalls.filter((l) => !/,\s*'[^']*(vw|px)'\s*\)/.test(l))
if (noSizes.length) fail(`слоты фото без sizes: ${noSizes.length} из ${phCalls.length}`)
else ok(`${phCalls.length} слотов фото получают sizes — браузер выберет вариант по ширине слота`)

const heroTag = (body.match(/<img id="hero-img"[^>]*>/) || [])[0] || ''
const heroSources = [...body.matchAll(/srcset="assets\/hero-[^"]*"/g)].map((m) => m[0])
const heroWidths = heroSources.map((s) => (s.match(/(\d+)w/g) || []).join('+'))
if (heroSources.length < 2) fail('у главного фото нет набора вариантов в разметке')
else if (heroWidths.some((x) => x !== '400w+800w+1280w')) fail(`у главного фото неполный набор вариантов: ${heroWidths.join(' · ')}`)
else if (!/fetchpriority="high"/.test(heroTag)) fail('главное фото без fetchpriority="high"')
else if (/loading="lazy"/.test(heroTag)) fail('главное фото отложено — оно обязано грузиться сразу')
else ok('главное фото: набор 400/800/1280 в разметке, грузится сразу и с приоритетом')

/* 9. пути к файлам обязаны оставаться относительными: сайт публикуется в
      подпапке репозитория (/<репозиторий>/), и абсолютный /assets/… там
      разрешится в никуда — страница открылась бы без картинок. Тот же страж
      стоит в workflow, но пусть ловится и локально. */
const absolute = [...html.matchAll(/(?:src|href)="(\/(?:madrock|assets)\/[^"]*)"/g)].map((m) => m[1])
if (absolute.length) fail(`в index.html абсолютные пути: ${absolute.slice(0, 5).join(', ')}`)
else ok('пути к файлам относительные — сайт заработает в подпапке репозитория')

/* --- отчёт --- */
console.log('— проверка MADROCK —')
notes.forEach((n) => console.log('  ✓ ' + n))
if (problems.length) {
  console.log('\nОШИБКИ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  console.log('\nвсе проверки пройдены')
}
