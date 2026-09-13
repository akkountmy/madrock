/**
 * Мобильная версия и карточка личного кабинета.
 *
 * 1. Кнопки в шапке на телефоне прижаты вправо (без навигации в потоке они
 *    липли к логотипу).
 * 2. Бегущая строка на телефоне: вместо движения — статичный список со всеми
 *    надписями сразу (дубли из разметки скрыты, их 9 из 18).
 * 3. Факты в титульном блоке на телефоне — ровная сетка 2×2, чтобы четвёртый
 *    не оставался на отдельной строке.
 * 4. Кнопка возврата наверх — по центру снизу.
 * 5. Личный кабинет открывается карточкой по центру сайта с прозрачным фоном;
 *    отдельная секция в потоке страницы больше не нужна.
 *
 * Запуск: node tools/fix-mobile-account.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  /* --- 1. кнопки в шапке вправо ----------------------------------------- */
  ['src/styles.css',
    '.hdr__act { display: flex; align-items: center; gap: .5rem; }',
    '.hdr__act { display: flex; align-items: center; gap: .5rem; margin-left: auto; }'],

  /* --- 2. кнопка «наверх» по центру ------------------------------------- */
  ['src/styles.css',
    '  position: fixed; right: clamp(1rem, 2.4vw, 1.8rem); bottom: clamp(1rem, 2.4vw, 1.8rem); z-index: 80;',
    '  position: fixed; left: 50%; margin-left: -23px; bottom: clamp(1rem, 2.4vw, 1.8rem); z-index: 80;'],

  /* --- 3. личный кабинет: шапка, кнопка в бонусах, подвал ---------------- */
  ['src/body.html',
    '      <a class="icon-btn" href="#account" title="Личный кабинет" aria-label="Личный кабинет">',
    '      <button class="icon-btn" type="button" data-account title="Личный кабинет" aria-label="Личный кабинет">'],
  ['src/body.html',
    '        <a class="btn btn--brand" href="#account">Открыть личный кабинет</a>',
    '        <button class="btn btn--brand" type="button" data-account>Открыть личный кабинет</button>'],
  ['src/body.html',
    '          <a href="#account">Личный кабинет</a>',
    '          <a href="#account" data-account>Личный кабинет</a>'],
  ['src/app.js',
    "'<a class=\"btn btn--ghost\" href=\"#account\" id=\"co-acc\" type=\"button\">В личный кабинет</a></div>' +",
    "'<button class=\"btn btn--ghost\" type=\"button\" data-account>В личный кабинет</button></div>' +"],

  /* --- 4. секцию кабинета убираем, вместо неё карточка ------------------- */
  ['src/body.html',
    `  <!-- ─── ЛИЧНЫЙ КАБИНЕТ ───────────────────────────────────────────────── -->
  <section class="section section--surface" id="account">
    <div class="wrap">
      <div class="sec-head reveal">
        <div class="sec-head__text">
          <span class="kicker">Личный кабинет</span>
          <h2 class="h2">Бонусы, уровни и подарки в одном месте</h2>
          <p class="lead">Войдите по номеру телефона — бонусы, купоны, печати и история заказов сохранятся на этом устройстве. Демо-режим: любой номер и код <b class="accent">0000</b>.</p>
        </div>
      </div>
      <div id="acc-root" class="reveal"></div>
    </div>
  </section>

`, ''],

  /* --- 5. разметка карточки кабинета ------------------------------------- */
  ['src/body.html',
    `<!-- ─── модальное окно оформления ───────────────────────────────────────── -->`,
    `<!-- ─── карточка личного кабинета ───────────────────────────────────────── -->
<div class="modal modal--account" id="account-modal" role="dialog" aria-modal="true" aria-label="Личный кабинет">
  <div class="modal__c modal__c--account">
    <button class="icon-btn modal__x" id="account-close" aria-label="Закрыть">✕</button>
    <div class="kicker" style="margin-bottom:1rem">Личный кабинет</div>
    <div id="acc-root"></div>
  </div>
</div>

<!-- ─── модальное окно оформления ───────────────────────────────────────── -->`],

  /* --- 6. поведение карточки в скрипте ----------------------------------- */
  ['src/app.js',
    `  /* --- события ----------------------------------------------------------- */
  var bindEvents = function () {`,
    `  /* --- карточка личного кабинета ----------------------------------------- */
  var openAccount = function () {
    renderAccount();
    $('#account-modal').classList.add('on');
    $('#scrim').classList.add('on', 'scrim--clear');
    document.body.classList.add('no-scroll');
  };
  var closeAccount = function () {
    $('#account-modal').classList.remove('on');
    $('#scrim').classList.remove('on', 'scrim--clear');
    if (!$('#checkout-modal').classList.contains('on') && !$('#cart').classList.contains('on')) document.body.classList.remove('no-scroll');
  };

  /* --- события ----------------------------------------------------------- */
  var bindEvents = function () {`],

  ['src/app.js',
    "      if (e.target.id === 'co-done') closeCheckout();",
    "      if (e.target.id === 'co-done') closeCheckout();\n      if (e.target.closest('[data-account]')) { e.preventDefault(); openAccount(); }\n      if (e.target.id === 'account-close' || e.target.id === 'account-modal') closeAccount();"],

  ['src/app.js',
    `      if ($('#checkout-modal').classList.contains('on')) closeCheckout();
      else if ($('#item-modal').classList.contains('on')) closeItem();`,
    `      if ($('#account-modal').classList.contains('on')) closeAccount();
      else if ($('#checkout-modal').classList.contains('on')) closeCheckout();
      else if ($('#item-modal').classList.contains('on')) closeItem();`],
]

const CSS = `
/* --- мобильная версия: правки по замечаниям ------------------------------ */
@media (max-width: 780px) {
  /* бегущая строка: на телефоне не бежит, а показывает все надписи сразу;
     список в разметке продублирован для прокрутки — дубли скрываем */
  .ticker { overflow: visible; -webkit-mask-image: none; mask-image: none; }
  .ticker__row {
    animation: none; width: auto; flex-wrap: wrap; justify-content: center;
    gap: .3rem .9rem; text-align: center;
  }
  .ticker__row span:nth-child(n + 10) { display: none; }

  /* факты титульного блока: ровная сетка 2×2, без одинокой четвёртой ячейки */
  .hero__facts {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: .9rem 1rem; align-items: start;
  }
  .hero__facts .fact { text-align: left; }
}

/* --- карточка личного кабинета ------------------------------------------- */
.modal__c--account {
  width: min(1000px, calc(100vw - 2rem)); max-height: 88vh; overflow-y: auto;
  background: rgba(14, 14, 14, .88);
  border-color: rgba(255, 240, 225, .14);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: var(--shadow-3);
}
/* фон под карточкой прозрачный: сайт виден за ней */
.scrim--clear { background: rgba(10, 10, 10, .26); backdrop-filter: blur(3px); }
@media (max-width: 780px) {
  .modal__c--account { width: calc(100vw - 1.2rem); max-height: 92vh; padding: 1.2rem; }
}
`

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
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 58).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('мобильная версия: правки по замечаниям') < 0) {
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
