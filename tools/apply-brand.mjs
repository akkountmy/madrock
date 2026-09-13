/**
 * Перенос бренда кофейни в сайт.
 *
 * По логотипу (225×225, белый фон, чёрная надпись, глубокий красный #BE1A23)
 * видно настоящую палитру: чёрный + красный + белый. Меняю акцентные токены
 * (янтарный → брендовый красный), перевожу «золото» в тёплый песочный, а все
 * полупрозрачные подложки — на переменную с каналами акцента, чтобы палитра
 * дальше менялась в одном месте.
 *
 * Запуск: node tools/apply-brand.mjs
 */
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* --- 1. логотип: из папки проекта в assets/brand/logo.png ---------------- */
await copyFile(join(root, 'images.jfif'), join(root, 'assets', 'brand', 'logo-source.jpg'))
console.log('исходник сохранён: assets/brand/logo-source.jpg')
// перекодирование jfif → png делает PowerShell ниже (System.Drawing)

/* --- 2. токены палитры --------------------------------------------------- */
const TOKENS = [
  ['  --ink:        #0d0b0a;', '  --ink:        #0b0a0a;'],
  ['  --amber:      #ff8a1f;', '  --amber:      #e0242e;   /* брендовый красный из логотипа */\n  --accent-rgb: 224, 36, 46;'],
  ['  --amber-2:    #ffb347;', '  --amber-2:    #ff5f66;'],
  ['  --gold:       #ffd166;', '  --gold:       #efb775;   /* тёплый песочный вместо чистого золота */\n  --gold-rgb:   239, 183, 117;'],
  ['  --ember:      #ff4d1c;', '  --ember:      #a8121b;   /* глубокий брендовый, для градиентов */'],
  ['  --on-amber:   #241203;', '  --on-amber:   #221012;'],
]

/* --- 3. переходники на переменные и цветовой сдвиг ----------------------- */
const GLOBAL = [
  ['rgba(255, 138, 31,', 'rgba(var(--accent-rgb),'],   // янтарные подложки → красные
  ['rgba(255, 209, 102,', 'rgba(var(--gold-rgb),'],    // золотые подложки → песочные
  ['rgba(255, 77, 28,', 'rgba(168, 18, 27,'],          // оранжевый → глубокий красный
  ['background: var(--ember); color: #fff; font-size: var(--fs-xs); font-weight: 800;\n  text-transform: uppercase; letter-spacing: .12em; margin-bottom: 1.1rem;',
   'background: var(--amber); color: #fff; font-size: var(--fs-xs); font-weight: 800;\n  text-transform: uppercase; letter-spacing: .12em; margin-bottom: 1.1rem;'],
  // блок ниже ищется уже после замены rgb-литералов (строка с --gold-rgb выше)
  ['background: linear-gradient(135deg, #2a1a0c 0%, #1a1209 60%, #120d08 100%);\n  border: 1px solid rgba(var(--gold-rgb), .28);',
   'background: linear-gradient(135deg, #2a0d10 0%, #1a0a0c 60%, #120809 100%);\n  border: 1px solid rgba(var(--accent-rgb), .34);'],
  ['.tag--fest { background: rgba(255, 90, 60, .92); color: #fff; }',
   '.tag--fest { background: rgba(142, 15, 22, .95); color: #fff; }'],
]

const HEX = [
  ['#ff8a1f', '#e0242e'],
  ['#ffd166', '#efb775'],
  ['#ff4d1c', '#a8121b'],
  ['%23ff8a1f', '%23e0242e'],
  ['%23ffd166', '%23efb775'],
]

const cache = new Map()
const load = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(join(root, file), 'utf8'))
  return cache.get(file)
}

const report = []
const problems = []

const cssFile = 'src/styles.css'
let css = await load(cssFile)
for (const [from, to] of TOKENS) {
  const parts = css.split(from)
  const found = parts.length - 1
  if (found !== 1) { problems.push(`токен «${from.trim()}» — найдено ${found}`); continue }
  css = parts.join(to)
  report.push('токен ' + from.trim().split(':')[0].trim())
}
for (const [from, to] of GLOBAL) {
  const parts = css.split(from)
  const found = parts.length - 1
  if (found < 1) { problems.push(`в CSS не найдено «${from.slice(0, 48)}…»`); continue }
  css = parts.join(to)
  report.push(`${from.split('(')[0].slice(0, 24)} × ${found}`)
}
cache.set(cssFile, css)

for (const file of ['src/body.html', 'src/shell.html', 'src/app.js']) {
  let text = await load(file)
  let changed = 0
  for (const [from, to] of HEX) {
    const parts = text.split(from)
    changed += parts.length - 1
    text = parts.join(to)
  }
  if (changed > 0) report.push(`${file}: цветов заменено ${changed}`)
  cache.set(file, text)
}

if (problems.length) {
  console.log('ПРАВКИ НЕ ПРИМЕНЕНЫ:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exitCode = 1
} else {
  for (const [file, text] of cache) await writeFile(join(root, file), text, 'utf8')
  console.log('применено:')
  report.forEach((r) => console.log('  ✓ ' + r))
}
