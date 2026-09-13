/**
 * Вторая правка: подсветка активного пункта меню, отклик на клик,
 * адаптив карточки напитка и мелкие тексты.
 * Запуск: node tools/fix-copy-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD_SCROLL = `    var onScroll = function () {
      $('#hdr').classList.toggle('scrolled', window.scrollY > 20);
      var y = window.scrollY + 140, cur = '';
      ['home', 'menu', 'preorder', 'bonus', 'account', 'about', 'contacts'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      });
      $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });
    };`

const NEW_SCROLL = `    /* Подсветка активного пункта. Разделы нужно брать в порядке разметки:
       прежний список шёл вручную и «О нас» перебивал «Меню», потому что стоит
       выше по странице, но позже в перечислении. */
    var navSections = function () {
      return $$('#nav a').map(function (a) {
        var id = (a.getAttribute('href') || '').replace('#', '');
        return { id: id, el: id ? document.getElementById(id) : null };
      }).filter(function (s) { return s.el !== null; })
        .sort(function (a, b) { return a.el.offsetTop - b.el.offsetTop; });
    };

    var onScroll = function () {
      $('#hdr').classList.toggle('scrolled', window.scrollY > 20);
      var y = window.scrollY + 150, cur = '';
      navSections().forEach(function (s) { if (s.el.offsetTop <= y) cur = s.id; });
      $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });
    };`

const EDITS = [
  // --- подсветка меню ---
  ['src/app.js', OLD_SCROLL, NEW_SCROLL, 1],
  // клик по пункту меню подсвечивает его сразу, не дожидаясь прокрутки
  ['src/app.js',
    "      if (e.target.closest('#nav a')) { $('#nav').classList.remove('on'); }",
    "      var navLink = e.target.closest('#nav a');\n" +
    "      if (navLink) {\n" +
    "        $('#nav').classList.remove('on');\n" +
    "        $$('#nav a').forEach(function (a) { a.classList.toggle('on', a === navLink); });\n" +
    "      }", 1],
  // --- шаги оформления и карточка напитка ---
  ['src/app.js', "var names = ['Заказ', 'Точка и время', 'Контакты', 'Оплата'];", "var names = ['Заказ', 'Кофейня и время', 'Контакты', 'Оплата'];", 1],
  ['src/app.js', "'<div class=\"grid-2\" style=\"gap:1.4rem;grid-template-columns:1fr 1.1fr\">' +", "'<div class=\"grid-2 item-hero\">' +", 1],
  ['src/data.js', 'Всё, что меняется без правки вёрстки: точки, меню, акции, уровни, отзывы.', 'Всё, что меняется без правки вёрстки: кофейни, меню, акции, уровни, отзывы.', 1],
  ['README.md', '← ДАННЫЕ: точки, меню, цены, акции, уровни, отзывы', '← ДАННЫЕ: кофейни, меню, цены, акции, уровни, отзывы', 1],
  ['README.md', '4 шага: заказ → точка и время → контакты → оплата', '4 шага: заказ → кофейня и время → контакты → оплата', 1],
  ['README.md', 'часы по каждой точке**', 'часы по каждой кофейне**', 1],
]

const CSS_ADD = `
/* --- правки после аудита вёрстки ----------------------------------------- */
/* Карточка напитка: две колонки только там, где для них есть место */
.item-hero { gap: 1.4rem; grid-template-columns: 1fr 1.1fr; }

@media (max-width: 900px) {
  /* в шапке освобождаем место: статус уступает кнопкам */
  .hdr__in { gap: .5rem; }
  .status { display: none; }
}

@media (max-width: 780px) {
  .item-hero { grid-template-columns: 1fr; }
  .sec-head { gap: 1rem; }
}

@media (max-width: 420px) {
  .logo__sub { display: none; }
  .hdr__act { gap: .35rem; }
  .icon-btn { width: 38px; height: 38px; }
}

/* Длинные названия позиций не должны выпирать из карточки */
.item__name, .item__desc, .cart-line__n, .tile__t, .contact-card__n { overflow-wrap: anywhere; }
.item__body, .cart-line > div, .tile { min-width: 0; }
.promo__title, .promo__desc { overflow-wrap: anywhere; }
`

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

// CSS дописываем в конец, если ещё не дописан
const css = await load('src/styles.css')
if (css.indexOf('правки после аудита вёрстки') < 0) {
  cache.set('src/styles.css', css.trimEnd() + '\n' + CSS_ADD)
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
