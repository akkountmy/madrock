/**
 * Блок контактов: у каждой кофейни своя фотография, ровная сетка, ничего не
 * выпирает и не кособочится.
 *
 * Что было не так:
 *   • карточки 3 и 5 брали PHOTO.table — такого ключа в наборе нет, поэтому
 *     у них вообще не было картинки;
 *   • последняя карточка в ряду растягивалась на всю ширину (auto-fit схлопывал
 *     пустые колонки), из-за чего её фото становилось вдвое крупнее соседей;
 *   • иконки в строках были разной ширины, поэтому текст начинался со сдвигом;
 *   • кнопки стояли на разной высоте — карточки выглядели «кривовато».
 *
 * Теперь: пять кофеен со своими снимками + карточка-приглашение = шесть карточек
 * и ровная сетка; фото в полосе фиксированной высоты; значки в своей колонке;
 * кнопка прижата к низу карточки.
 *
 * Запуск: node tools/fix-contacts.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const OLD_CONTACTS = `    $('#contacts-grid').innerHTML = SHOP.points.map(function (p, i) {
      var src = i % 3 === 0 ? PHOTO.interior : i % 3 === 1 ? PHOTO.interior2 : PHOTO.table;
      return '<article class="contact-card">' +
        '<div class="contact-card__map">' + ph(src, p.name, 'ph--zoom', 'Кофейня MADROCK на ' + p.address) +
        '<div class="map-note" style="background:none;align-items:end;justify-content:start;padding:1rem;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.8)">' +
        '<span class="badge">📍 ' + esc(p.address) + '</span></div></div>' +
        '<div class="contact-card__b">' +
        '<div class="contact-card__n">MADROCK · ' + esc(p.name) + '</div>' +
        '<div class="cinfo">' +
        '<div class="cinfo__r">🕗 <span><b>' + esc(p.hours) + '</b> · ежедневно</span></div>' +
        '<div class="cinfo__r">📞 <a href="tel:' + SHOP.phone.replace(/[^+\\d]/g, '') + '"><b>' + esc(SHOP.phone) + '</b></a></div>' +
        '<div class="cinfo__r">💺 <span>' + p.seats + ' мест</span></div>' +
        '<div class="cinfo__r">🎒 <span>' + esc(p.features.join(' · ')) + '</span></div>' +
        '</div>' +
        '<button class="btn btn--soft btn--sm" data-point="' + p.id + '" type="button">Выбрать эту кофейню для предзаказа</button>' +
        '</div></article>';
    }).join('');`

const NEW_CONTACTS = `    /* Пять кофеен и карточка-приглашение: шесть карточек дают ровную сетку
       без одинокой карточки в последнем ряду. */
    var contactPhoto = [PHOTO.interior, PHOTO.interior2, PHOTO.interior3, PHOTO.interior4, PHOTO.hero];
    var tel = 'tel:' + SHOP.phone.replace(/[^+\\d]/g, '');
    var cardHTML = function (opts) {
      return '<article class="contact-card' + (opts.invite ? ' contact-card--invite' : '') + '">' +
        '<div class="contact-card__map">' + ph(opts.photo, opts.mark, 'ph--zoom', opts.alt) +
        '<span class="contact-card__pin">' + esc(opts.pin) + '</span></div>' +
        '<div class="contact-card__b">' +
        '<div class="contact-card__n">' + esc(opts.title) + '</div>' +
        '<div class="cinfo">' + opts.rows.map(function (row) {
          return '<div class="cinfo__r"><span class="cinfo__i">' + row[0] + '</span><span>' + row[1] + '</span></div>';
        }).join('') + '</div>' +
        opts.cta +
        '</div></article>';
    };

    $('#contacts-grid').innerHTML = SHOP.points.map(function (p, i) {
      return cardHTML({
        photo: contactPhoto[i] || PHOTO.interior,
        mark: p.name,
        alt: 'Кофейня MADROCK на ' + p.address,
        pin: '📍 ' + p.address,
        title: 'MADROCK · ' + p.name,
        rows: [
          ['🕗', '<b>' + esc(p.hours) + '</b> · ежедневно'],
          ['📞', '<a href="' + tel + '">' + esc(SHOP.phone) + '</a>'],
          ['💺', p.seats + ' мест'],
          ['🎒', esc(p.features.slice(0, 3).join(' · '))],
        ],
        cta: '<button class="btn btn--outline contact-card__cta" data-point="' + p.id + '" type="button" title="' +
          esc(p.features.join(' · ')) + '">Выбрать для предзаказа</button>',
      });
    }).join('') + cardHTML({
      photo: PHOTO.barista,
      mark: 'MADROCK',
      alt: 'Команда бара MADROCK',
      pin: '☕ Команда бара',
      invite: true,
      title: 'Не знаете, какую выбрать?',
      rows: [
        ['📞', 'Позвоните: <a href="' + tel + '">' + esc(SHOP.phone) + '</a>'],
        ['💬', 'Viber и Telegram — на тот же номер'],
        ['📸', 'Instagram <a href="https://instagram.com/madrock_coffee">@madrock_coffee</a>'],
        ['🗺️', 'Пять точек в Гомеле, все с предзаказом'],
      ],
      cta: '<a class="btn btn--brand contact-card__cta" href="#preorder">Собрать предзаказ</a>',
    });`

const CSS = `
/* --- контакты: ровная сетка карточек --------------------------------------
   Фото в полосе фиксированной высоты (раньше снимок сам задавал высоту и
   растягивал карточку), значки в своей колонке, кнопка прижата к низу. */
.contacts { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: stretch; }
.contact-card { height: 100%; }
.contact-card__map { height: 180px; }
.contact-card__map .ph { height: 100%; }
.contact-card__pin {
  position: absolute; left: .8rem; bottom: .8rem; z-index: 2;
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .3rem .7rem; border-radius: var(--r-pill);
  background: rgba(11, 10, 10, .62); border: 1px solid rgba(255, 240, 225, .18);
  color: #fff; font-size: var(--fs-xs); font-weight: 700; backdrop-filter: blur(6px);
}
.contact-card__b { display: flex; flex-direction: column; gap: .75rem; flex: 1; }
.contact-card__cta { margin-top: auto; align-self: flex-start; }
.contact-card--invite {
  border-color: rgba(var(--accent-rgb), .38);
  background-image: linear-gradient(160deg, rgba(var(--accent-rgb), .09), transparent 58%);
}
.cinfo { display: grid; gap: .5rem; }
.cinfo__r { display: grid; grid-template-columns: 20px 1fr; gap: .5rem; align-items: start; font-size: .92rem; color: var(--muted); }
.cinfo__i { text-align: center; line-height: 1.45; }
@media (max-width: 520px) { .contact-card__map { height: 160px; } }
`

const EDITS = [
  // фотографии для кофеен
  ['src/data.js',
    "  icetea:     'icetea.jpg',\n};",
    "  icetea:     'icetea.jpg',\n  interior3:  'interior3.jpg',\n  interior4:  'interior4.jpg',\n};"],
  // сама разметка контактов
  ['src/app.js', OLD_CONTACTS, NEW_CONTACTS],
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
  if (found !== 1) { problems.push(`${file}: «${from.slice(0, 70).replace(/\n/g, '⏎')}…» — найдено ${found}`); continue }
  cache.set(file, parts.join(to))
  applied += 1
}

const css = await load('src/styles.css')
if (css.indexOf('контакты: ровная сетка карточек') < 0) {
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
