/**
 * Правки по замечаниям: категории без горизонтальной прокрутки, фавикон из
 * логотипа, прозрачная кнопка «наверх», выравнивание ширин по блоку акции.
 *
 * Запуск: node tools/fix-layout.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  /* --- 1. категории меню: вместо горизонтальной прокрутки — перенос строк --- */
  ['src/styles.css',
    '.rail { display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .6rem; margin-bottom: 1.6rem; scrollbar-width: thin; }',
    '.rail { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.6rem; }', 1],
  ['src/styles.css',
    '  flex-shrink: 0; padding: .6rem 1.05rem; border-radius: var(--r-pill); border: 1px solid var(--line);',
    '  padding: .6rem 1.05rem; border-radius: var(--r-pill); border: 1px solid var(--line);', 1],

  /* --- 2. ширины: содержимое героя и заголовков тянется до краёв блока акции --- */
  ['src/styles.css',
    '.hero__in { padding: clamp(3rem, 9vw, 7rem) 0 clamp(2.4rem, 6vw, 4.4rem); max-width: 900px; }',
    '.hero__in { padding: clamp(3rem, 9vw, 7rem) 0 clamp(2.4rem, 6vw, 4.4rem); }', 1],
  ['src/styles.css',
    '.sec-head__text { max-width: 62ch; }',
    '.sec-head__text { flex: 1 1 34rem; min-width: 0; }', 1],
  // абзацы остаются читаемой длины, но ряды блоков идут до края
  ['src/styles.css',
    '.lead { font-size: var(--fs-lead); color: var(--muted); max-width: 58ch; }',
    '.lead { font-size: var(--fs-lead); color: var(--muted); max-width: 58ch; }\n.sec-head .lead { max-width: 72ch; }', 1],

  /* --- 3. кнопка «наверх»: разметка --- */
  ['src/body.html',
    '<div class="toasts" id="toasts"></div>',
    '<button class="totop" id="totop" type="button" aria-label="Наверх" title="Наверх">\n' +
    '  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6"/><path d="M5.5 12.5 12 6l6.5 6.5"/></svg>\n' +
    '</button>\n\n<div class="toasts" id="toasts"></div>', 1],

  /* --- 4. кнопка «наверх»: стиль --- */
  ['src/styles.css',
    '/* --- уведомления и модальные окна ---------------------------------------- */',
    '/* --- кнопка возврата наверх (прозрачная) -------------------------------- */\n' +
    '.totop {\n' +
    '  position: fixed; right: clamp(1rem, 2.4vw, 1.8rem); bottom: clamp(1rem, 2.4vw, 1.8rem); z-index: 80;\n' +
    '  width: 46px; height: 46px; border-radius: 50%;\n' +
    '  display: inline-flex; align-items: center; justify-content: center;\n' +
    '  background: rgba(255, 240, 225, .06); color: var(--cream);\n' +
    '  border: 1px solid rgba(255, 240, 225, .22); backdrop-filter: blur(10px) saturate(1.2);\n' +
    '  opacity: 0; visibility: hidden; transform: translateY(10px);\n' +
    '  transition: opacity .25s var(--ease), visibility .25s var(--ease), transform .25s var(--ease), background .2s, border-color .2s, color .2s;\n' +
    '}\n' +
    '.totop.on { opacity: 1; visibility: visible; transform: none; }\n' +
    '.totop:hover { color: #fff; border-color: var(--amber); background: rgba(var(--accent-rgb), .3); }\n\n' +
    '/* --- уведомления и модальные окна ---------------------------------------- */', 1],
  ['src/styles.css',
    '@media print {\n  body::before, .hdr, .drawer, .scrim, .toasts, .ticker { display: none !important; }',
    '@media print {\n  body::before, .hdr, .drawer, .scrim, .toasts, .ticker, .totop { display: none !important; }', 1],

  /* --- 5. кнопка «наверх»: поведение --- */
  ['src/app.js',
    "      $('#hdr').classList.toggle('scrolled', window.scrollY > 20);",
    "      $('#hdr').classList.toggle('scrolled', window.scrollY > 20);\n" +
    "      var totop = $('#totop');\n" +
    "      if (totop) totop.classList.toggle('on', window.scrollY > 700);", 1],
  ['src/app.js',
    "      if (e.target.id === 'burger') { $('#nav').classList.toggle('on'); }",
    "      if (e.target.closest('#totop')) { window.scrollTo({ top: 0, behavior: 'smooth' }); }\n" +
    "      if (e.target.id === 'burger') { $('#nav').classList.toggle('on'); }", 1],

  /* --- 6. фавикон: картинка из проекта --- */
  ['src/shell.html',
    '<link rel="apple-touch-icon" href="assets/brand/logo.png">',
    '<link rel="icon" type="image/png" href="/madrock/assets/brand/logo.png">\n<link rel="apple-touch-icon" href="/madrock/assets/brand/logo.png">', 1],
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
    problems.push(`${file}: «${from.slice(0, 70).replace(/\n/g, '⏎')}» — найдено ${found}, ожидалось ${expected}`)
    continue
  }
  cache.set(file, parts.join(to))
  applied += 1
}

// фавикон-заглушку из data-URI убираем: теперь иконка — файл логотипа
const shell = await load('src/shell.html')
const fav = shell.split('\n').filter((line) => !line.includes('rel="icon" href="data:image/svg+xml')).join('\n')
if (fav !== shell) {
  cache.set('src/shell.html', fav)
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
