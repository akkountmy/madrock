/**
 * Кабинет входа на всю ширину секции: форма слева, пояснение и образец
 * QR-карты справа — чтобы секция совпадала по краям с блоком акции.
 * Запуск: node tools/fix-account.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const START_FROM = `      root.innerHTML =
        '<div class="auth panel">' +`
const START_TO = `      root.innerHTML =
        '<div class="grid-2 grid-2--wide" style="align-items:start">' +
        '<div class="auth panel">' +`

const END_FROM = `            '<p class="hint">Демонстрационный вход: данные хранятся только в вашем браузере и никуда не отправляются.</p>' +
          '</div>' +
        '</div>';
      return;`
const END_TO = `            '<p class="hint">Демонстрационный вход: данные хранятся только в вашем браузере и никуда не отправляются.</p>' +
          '</div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="tier">' +
            '<span class="kicker" style="margin:0">Что даёт карта</span>' +
            '<ul class="tier__list">' +
              '<li><span>5–10% бонусами с каждого заказа — в зале и в предзаказе</span></li>' +
              '<li><span>Каждый 10-й напиток в подарок, а первая печать уже стоит</span></li>' +
              '<li><span>Оплата бонусами до 50% чека, остальное — картой</span></li>' +
              '<li><span>Двойной кэшбэк на день рождения и дегустации новинок</span></li>' +
            '</ul>' +
          '</div>' +
          '<div class="tier">' +
            '<div class="between"><h3 class="h3">Так выглядит ваша карта</h3><span class="badge badge--hot">QR</span></div>' +
            '<div class="row" style="align-items:center;gap:1.2rem">' + qrHTML('madrock-demo') +
            '<p class="small muted" style="flex:1;min-width:14rem;margin:0">После входа здесь появится ваш код: покажите его на баре — печати и бонусы начислят без напоминаний.</p></div>' +
          '</div>' +
        '</div>' +
        '</div>';
      return;`

const EDITS = [
  ['src/app.js', START_FROM, START_TO, 1],
  ['src/app.js', END_FROM, END_TO, 1],
  // карточка формы больше не центрируется — она стоит в своей колонке
  ['src/styles.css', '.auth { max-width: 520px; margin: 0 auto; }', '.auth { max-width: 560px; }', 1],
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
    problems.push(`${file}: «${from.slice(0, 60).replace(/\n/g, '⏎')}…» — найдено ${found}, ожидалось ${expected}`)
    continue
  }
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
