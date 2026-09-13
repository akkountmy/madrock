/**
 * Подстановка настоящего логотипа MADROCK.
 *
 * В шапку добавляется <img> на assets/brand/logo.png: если файл есть — он
 * показывается, если файла нет — картинка убирает себя и остаётся нарисованный
 * знак. Так логотип можно положить в проект без правки кода.
 * Запуск: node tools/fix-logo.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  ['src/body.html',
    '      <svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true">',
    '      <span class="logo__mark">\n' +
    '        <img class="logo__img" src="assets/brand/logo.png" alt="MADROCK COFFEE" onerror="this.remove()">\n' +
    '        <svg class="logo__svg" viewBox="0 0 40 40" aria-hidden="true">', 1],
  ['src/body.html',
    '      </svg>\n      <span class="logo__txt">\n        <span class="logo__name">MADROCK</span>',
    '      </svg>\n      </span>\n      <span class="logo__txt">\n        <span class="logo__name">MADROCK</span>', 1],
  // логотип и стиль по бренду: иконка приложения указывает на тот же файл
  ['src/shell.html',
    '<link rel="icon" href="data:image/svg+xml,',
    '<link rel="apple-touch-icon" href="assets/brand/logo.png">\n<link rel="icon" href="data:image/svg+xml,', 1],
]

const CSS_ADD = `
/* Настоящий логотип из бренда: показывается, если файл лежит в assets/brand */
.logo__mark { position: relative; display: block; }
.logo__svg { display: block; width: 100%; height: 100%; }
.logo__img {
  position: absolute; inset: 0; z-index: 2;
  width: 100%; height: 100%; object-fit: cover; border-radius: 11px;
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
  if (found !== expected) {
    problems.push(`${file}: «${from.slice(0, 70).replace(/\n/g, '⏎')}» — найдено ${found}, ожидалось ${expected}`)
    continue
  }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('Настоящий логотип из бренда') < 0) {
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
