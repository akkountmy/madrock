/**
 * Шапка: всегда закреплена вверху и после прокрутки — прозрачная.
 *
 * Причина, по которой шапка «пропадала»: у body стояло overflow-x: hidden.
 * По правилам CSS вторая ось при этом становится auto, body превращается
 * в скролл-контейнер, и position: sticky у его дочерних элементов перестаёт
 * работать — шапка уезжает вместе с содержимым. Лечится значением clip:
 * оно обрезает по горизонтали, но скролл-контейнера не создаёт.
 *
 * Заодно меняю логику фона: раньше при прокрутке шапка становилась плотнее,
 * теперь — прозрачнее (стекло), как и просили.
 *
 * Запуск: node tools/fix-header.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  // 1. прокрутка страницы: clip вместо hidden, иначе sticky не работает
  ['src/styles.css',
    '  -webkit-font-smoothing: antialiased;\n  overflow-x: hidden;\n}',
    '  -webkit-font-smoothing: antialiased;\n  /* clip, а не hidden: hidden делает body скролл-контейнером и ломает\n     position: sticky у шапки */\n  overflow-x: clip;\n}'],

  // 2. фон шапки: прозрачная в покое, стеклянная после прокрутки
  ['src/styles.css',
    `.hdr {
  position: sticky; top: 0; z-index: 60;
  background: color-mix(in srgb, var(--ink) 82%, transparent);
  backdrop-filter: blur(16px) saturate(1.3);
  border-bottom: 1px solid transparent;
  transition: border-color .3s, background .3s;
}
.hdr.scrolled { border-bottom-color: var(--line); background: color-mix(in srgb, var(--ink) 94%, transparent); }`,
    `.hdr {
  position: sticky; top: 0; z-index: 60;
  background: transparent;
  backdrop-filter: blur(8px) saturate(1.15);
  border-bottom: 1px solid transparent;
  transition: background .3s var(--ease), border-color .3s var(--ease), backdrop-filter .3s var(--ease);
}
/* после прокрутки шапка остаётся на виду, но становится прозрачной:
   тёмная подложка лёгкая, размытие держит текст читаемым на любом фоне */
.hdr.scrolled {
  background: color-mix(in srgb, var(--ink) 42%, transparent);
  border-bottom-color: var(--line);
  backdrop-filter: blur(16px) saturate(1.35);
}`],
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
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 60).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
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
