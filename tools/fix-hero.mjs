/**
 * Титульный блок: содержимое ложится на фотографию.
 *
 * Было: затемняющий слой шёл сверху вниз и на 45% высоты был уже почти чёрным —
 * фотография читалась как тёмное поле, а не как снимок. Стало: затемнение слева
 * направо (текст в тёмной части, снимок виден справа), лёгкая виньетка сверху и
 * снизу, у блока появилась высота, чтобы фотография занимала заметную площадь.
 *
 * Запуск: node tools/fix-hero.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const CSS_FROM = `.hero { position: relative; overflow: hidden; isolation: isolate; }
.hero__bg { position: absolute; inset: 0; z-index: -2; }
.hero__bg img { width: 100%; height: 100%; object-fit: cover; }
.hero::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(120% 90% at 15% 10%, rgba(255, 138, 31, .16), transparent 55%),
    linear-gradient(180deg, rgba(13, 11, 10, .55) 0%, rgba(13, 11, 10, .82) 45%, var(--ink) 100%);
}
.hero__in { padding-block: clamp(3rem, 9vw, 7rem) clamp(2.4rem, 6vw, 4.4rem); }`

const CSS_TO = `/* Титульный блок — фото-обложка: снимок виден, текст лежит на нём */
.hero {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; align-content: center;
  min-height: clamp(520px, 66vh, 740px);
}
.hero__bg { position: absolute; inset: 0; z-index: -2; }
.hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }
.hero::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(70% 90% at 8% 12%, rgba(var(--accent-rgb), .20), transparent 58%),
    linear-gradient(90deg, rgba(11, 10, 10, .93) 0%, rgba(11, 10, 10, .86) 34%, rgba(11, 10, 10, .58) 62%, rgba(11, 10, 10, .24) 84%, rgba(11, 10, 10, .34) 100%),
    linear-gradient(180deg, rgba(11, 10, 10, .38) 0%, rgba(11, 10, 10, 0) 22%, rgba(11, 10, 10, 0) 68%, rgba(11, 10, 10, .92) 100%);
}
/* текст держим в затемнённой половине, чтобы справа было видно снимок */
.hero__badges, .hero__title, .hero__sub, .hero__cta { max-width: min(100%, 46rem); }
.hero__in { padding-block: clamp(3.2rem, 8vw, 6rem); }`

const EDITS = [
  ['src/styles.css', CSS_FROM, CSS_TO, 1],
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
  if (found !== expected) { problems.push(`${file}: фрагмент титульного блока не найден (${found})`); continue }
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
