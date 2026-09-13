/**
 * Сборка сайта MADROCK COFFEE в один самодостаточный index.html.
 *
 * Окно «Превью» (плагин dsh-client-ui-review-preview) отдаёт ОДИН HTML-файл,
 * поэтому весь CSS и JS инлайнятся в него: страница работает и через
 * /lz-review/<ключ>, и при открытии файла с диска.
 */
import { readFile, writeFile, stat, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const src = join(root, 'src')

const read = (name) => readFile(join(src, name), 'utf8')

/* Шрифты лежат локально (assets/fonts) и описываются в src/fonts.css: сторонние
   домены на странице не нужны — это заметно ускоряет загрузку, особенно на
   телефоне, где раньше приходилось ждать два чужих сервера. */
let fonts = ''
try {
  fonts = await read('fonts.css')
} catch (error) {
  throw new Error('build: нет src/fonts.css — шрифты должны раздаваться с самого сайта, а не с Google Fonts')
}

const [shell, styles, data, body, app] = await Promise.all([
  read('shell.html'),
  read('styles.css'),
  read('data.js'),
  read('body.html'),
  read('app.js'),
])

const guard = (code, label) => {
  if (code.includes('</script')) throw new Error(`src/${label}: содержит </script> — сломает инлайн`)
  return code.trimEnd()
}

const html = shell
  .replace('<!--{{STYLES}}-->', () => styles.trimEnd() + '\n\n/* --- шрифты --- */\n' + fonts.trimEnd())
  .replace('<!--{{BODY}}-->', () => body.trimEnd())
  .replace('<!--{{SCRIPTS}}-->', () => `${guard(data, 'data.js')}\n\n${guard(app, 'app.js')}`)
  .replace('{{BUILT}}', new Date().toISOString().slice(0, 16).replace('T', ' '))

if (html.includes('<!--{{')) throw new Error('build: не все плейсхолдеры заменены')

/* Главное фото прописано в разметке статично (иначе браузер узнаёт о нём только
   после выполнения скрипта и теряет время на самом важном изображении).
   Следим, чтобы его имя не разошлось с PHOTO.hero в данных. */
const hero = (data.match(/hero:\s*'([^']+)'/) || [])[1]
if (!hero) throw new Error('build: в data.js не найден PHOTO.hero')
const heroBase = hero.replace(/\.jpe?g$/i, '')
if (!body.includes(`assets/${heroBase}-1280.webp`)) {
  throw new Error(`build: в body.html главное фото должно указывать на assets/${heroBase}-1280.webp (PHOTO.hero = ${hero})`)
}

const out = join(root, 'index.html')
await writeFile(out, html, 'utf8')
const info = await stat(out)
console.log(`build: index.html — ${(info.size / 1024).toFixed(1)} КБ`)

/* Сколько весит опубликованное: страница плюс все файлы assets (кроме служебных
   папок). Число полезно видеть при каждой сборке: это и есть «цена» открытия
   сайта, если пролистать его целиком. */
const assetsDir = join(root, 'assets')
const weight = async (dir) => {
  let bytes = 0
  let files = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const inner = await weight(full)
      bytes += inner.bytes
      files += inner.files
    } else {
      bytes += (await stat(full)).size
      files += 1
    }
  }
  return { bytes, files }
}
const published = await weight(assetsDir)
console.log(`build: публикуется ${published.files + 1} файлов, всего ${((published.bytes + info.size) / 1024 / 1024).toFixed(2)} МБ`)
