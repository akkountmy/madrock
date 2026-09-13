/**
 * Серьёзный стиль служебных кнопок (вторая попытка: короткие якоря).
 *
 * Кнопка «Копировать» в реферальном блоке, «Применить» у купонов, «Выйти» и
 * переключатель входа получают плотную брендовую форму: чёрный, красный,
 * белый, капслок с разрядкой, радиус 10 px. У копирования появляется
 * состояние «Скопировано».
 *
 * Запуск: node tools/fix-buttons-2.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD_COPY = `      if (e.target.id === 'ref-copy') {
        var inp = $('#ref-input');
        if (inp) {
          inp.select();
          try { document.execCommand('copy'); toast('Ссылка скопирована', 'ok'); } catch (err) { toast('Скопируйте вручную: ' + inp.value); }
        }
      }`

const NEW_COPY = `      if (e.target.id === 'ref-copy') {
        var inp = $('#ref-input');
        var button = $('#ref-copy');
        var report = function () {
          toast('Ссылка скопирована', 'ok');
          if (!button) return;
          var label = button.textContent;
          button.textContent = 'Скопировано';
          button.classList.add('done');
          setTimeout(function () { button.textContent = label; button.classList.remove('done'); }, 2200);
        };
        if (!inp) return;
        inp.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (err) { copied = false; }
        if (copied) { report(); return; }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(inp.value).then(report).catch(function () { toast('Скопируйте вручную: ' + inp.value); });
        } else {
          toast('Скопируйте вручную: ' + inp.value);
        }
      }`

const EDITS = [
  // реферальный блок: поле в рамке + плотная брендовая кнопка
  ['src/app.js',
    '<div class="ref-box"><input class="input" id="ref-input" readonly value="',
    '<div class="ref-box"><input class="input ref-box__field" id="ref-input" readonly value="', 1],
  ['src/app.js',
    '<button class="btn btn--gold" id="ref-copy" type="button">Копировать</button></div>',
    '<button class="btn btn--brand" id="ref-copy" type="button">Копировать</button></div>', 1],
  ['src/app.js', OLD_COPY, NEW_COPY, 1],

  // купоны и выход — тот же служебный стиль
  ['src/app.js', 'class="btn btn--sm btn--soft" data-coupon=', 'class="btn btn--outline" data-coupon=', 1],
  ['src/app.js', "'использован' : 'применить'", "'Использован' : 'Применить'", 1],
  ['src/app.js', 'class="btn btn--sm btn--soft" id="acc-logout"', 'class="btn btn--outline" id="acc-logout"', 1],

  // в окне напитка «Позже» читалось двусмысленно
  ['src/app.js', 'id="item-one" type="button">Позже<', 'id="item-one" type="button">Отмена<', 1],
]

const CSS = `
/* --- служебные кнопки в бренде логотипа -----------------------------------
   Плотная форма, капслок с разрядкой, чёткий край: кнопка читается как рабочая
   часть интерфейса, а не как декоративный элемент. */
.btn--brand {
  background: linear-gradient(180deg, #ef3b45, var(--amber) 52%, #bf1a24);
  color: #fff; border: 1px solid rgba(255, 255, 255, .2); border-radius: 10px;
  padding: .68rem 1.15rem; font-family: var(--font-display); font-weight: 700;
  font-size: .8rem; letter-spacing: .1em; text-transform: uppercase;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .22), 0 12px 26px -16px rgba(224, 36, 46, .95);
}
.btn--brand:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .28), 0 18px 32px -16px rgba(224, 36, 46, 1); }
.btn--brand:active { transform: translateY(0); }
.btn--brand.done {
  background: linear-gradient(180deg, #4ae3a4, #17a86e); border-color: rgba(255, 255, 255, .28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .3), 0 12px 26px -16px rgba(23, 168, 110, .9);
}
.btn--outline {
  background: transparent; color: var(--cream); border: 1px solid var(--line-2); border-radius: 10px;
  padding: .5rem .9rem; font-weight: 800; font-size: .7rem; letter-spacing: .12em; text-transform: uppercase;
}
.btn--outline:hover { border-color: var(--amber); color: var(--amber); background: rgba(var(--accent-rgb), .08); }
.btn--outline[disabled] { opacity: .45; pointer-events: none; }

/* поле реферальной ссылки: моноширинное, на чёрной подложке */
.ref-box { display: flex; gap: .5rem; align-items: stretch; }
.ref-box__field {
  font-family: var(--font-mono); font-size: .82rem; letter-spacing: .02em;
  background: var(--ink); border-color: var(--line-2); border-radius: 10px; min-width: 0;
}

/* переключатель «Вход / Регистрация» — тот же характер */
.auth__switch { border-radius: 10px; }
.auth__switch button { border-radius: 8px; font-size: .74rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 800; }

@media (max-width: 520px) {
  .ref-box { flex-direction: column; }
  .btn--brand { width: 100%; }
}
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
  if (found !== expected) { problems.push(`${file}: «${from.slice(0, 62).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('служебные кнопки в бренде логотипа') < 0) {
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
