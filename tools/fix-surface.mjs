/**
 * 1. Один фон сайта — чёрный: убираем коричневый оттенок у «поверхностей».
 * 2. Титульная фотография — по ширине блока «Акция недели» (1136 px, края 67/1203),
 *    а не во всю ширину экрана. Содержимое остаётся на фотографии.
 *
 * Запуск: node tools/fix-surface.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* --- 1. палитра фона ----------------------------------------------------- */
const TOKENS = [
  ['  --ink:        #0b0a0a;', '  --ink:        #0a0a0a;   /* единственный фон сайта */'],
  ['  --ink-2:      #14100d;', '  --ink-2:      #0a0a0a;   /* тот же чёрный: раньше здесь был коричневый оттенок */'],
  ['  --surface:    #171310;', '  --surface:    #121212;'],
  ['  --surface-2:  #1f1a16;', '  --surface-2:  #181818;'],
  ['  --surface-3:  #2a231d;', '  --surface-3:  #232323;'],
]

const NEUTRAL = [
  // коричневые подложки, оставшиеся от тёплой палитры
  ['linear-gradient(140deg, var(--surface-3), var(--surface-2) 55%, #3a2a1c)',
   'linear-gradient(140deg, var(--surface-3), var(--surface-2) 55%, #1d1d1d)'],
  ['.map-note { position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient(135deg, #1b1612, #241a12);',
   '.map-note { position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient(135deg, #141414, #1c1c1c);'],
  ['background: linear-gradient(135deg, #2a0d10 0%, #1a0a0c 60%, #120809 100%);',
   'background: linear-gradient(135deg, #1a0e10 0%, #120a0b 55%, #0b0708 100%);'],
]

/* --- 2. титульный блок в границах контента ------------------------------- */
const BODY_FROM = `    <div class="hero__bg ph" data-mark="MADROCK">
      <img id="hero-img" alt="Кофейня MADROCK в Гомеле" fetchpriority="high">
    </div>
    <div class="wrap hero__in">`
const BODY_TO = `    <div class="wrap">
      <div class="hero__box">
        <div class="hero__bg ph" data-mark="MADROCK">
          <img id="hero-img" alt="Кофейня MADROCK в Гомеле" fetchpriority="high">
        </div>
        <div class="hero__in">`

const HERO_CSS_FROM = `/* Титульный блок — фото-обложка: снимок виден, текст лежит на нём */
.hero {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; align-content: center;
  min-height: clamp(520px, 66vh, 740px);
}
/* два класса в селекторе: иначе правило слота фото .ph перебивало позиционирование */
.hero > .hero__bg { position: absolute; inset: 0; z-index: -2; }
.hero .hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }
.hero::after {`

const HERO_CSS_TO = `/* Титульный блок — карточка по ширине блока «Акция недели»: снимок виден,
   содержимое лежит на нём */
.hero { position: relative; padding-block: clamp(.8rem, 2.4vw, 1.4rem) 0; }
.hero__box {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--line); border-radius: var(--r-lg);
  display: grid; align-content: center;
  min-height: clamp(460px, 60vh, 680px);
}
/* два класса в селекторе: иначе правило слота фото .ph перебивало позиционирование */
.hero__box > .hero__bg { position: absolute; inset: 0; z-index: -2; }
.hero__box .hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }
.hero__box::after {`

const EDITS = [
  ...TOKENS.map(([f, t]) => ['src/styles.css', f, t]),
  ...NEUTRAL.map(([f, t]) => ['src/styles.css', f, t]),
  ['src/body.html', BODY_FROM, BODY_TO],
  ['src/styles.css', HERO_CSS_FROM, HERO_CSS_TO],
  // закрываем добавленные обёртки и убираем класс wrap у содержимого
  ['src/body.html',
    '      <div class="hero__facts" id="hero-facts"></div>\n    </div>\n  </section>',
    '      <div class="hero__facts" id="hero-facts"></div>\n        </div>\n      </div>\n    </div>\n  </section>'],
  // внутренние отступы содержимого: обёртка .wrap теперь снаружи
  ['src/styles.css',
    '.hero__in { padding-block: clamp(3.2rem, 8vw, 6rem); }',
    '.hero__in { padding: clamp(2rem, 5vw, 3.6rem) clamp(1.2rem, 4vw, 3rem); }'],
  // логотип в шапке: коричневая подложка знака
  ['src/body.html', '<rect width="40" height="40" rx="11" fill="#1c1512"/>', '<rect width="40" height="40" rx="11" fill="#151515"/>'],
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
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 58).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
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
