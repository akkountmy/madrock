# assets/fonts — локальные веб-шрифты

Здесь лежат файлы шрифтов, которые сайт отдаёт со своего домена: ни `fonts.googleapis.com`,
ни `fonts.gstatic.com` в разметке больше не упоминаются, поэтому браузер не тратит время
на сторонние DNS/TLS-подключения (главный тормоз первой отрисовки на мобильных).

Подключение описано в `src/fonts.css`; в папке — только файлы и проверка.

## Состав папки (15 файлов)

- `*.woff2` — **11 файлов**, по одному на «семейство + подмножество»;
- `OFL-manrope.txt`, `OFL-unbounded.txt` — тексты лицензии SIL Open Font License 1.1;
- `verify-fonts.mjs` — проверка: все ли адреса из `src/fonts.css` существуют, являются
  настоящими woff2, объявлены с диапазоном веса, `unicode-range` и `font-display: swap`;
- этот `README.md`.

## Почему один файл обслуживает весь диапазон весов

Manrope и Unbounded — **вариативные** шрифты с осью `wght`. Google отдаёт для всех
запрошенных весов одного подмножества **физически один и тот же файл**: в ответе CSS API
45 блоков `@font-face` ссылались всего на 11 адресов. Это проверено не на глаз, а хешами:
sha256 всех скачанных файлов дал ровно 11 уникальных значений, а внутри каждой группы
«семейство + подмножество» хеши и строки `unicode-range` совпали попарно. Поэтому каждый
файл несёт всю ось веса и в CSS объявлен диапазоном:

- **Manrope** — `font-weight: 400 800` (используются 400, 500, 600, 700, 800);
- **Unbounded** — `font-weight: 600 800` (используются 600, 700, 800).

Так браузер скачивает файл один раз и рисует им все нужные веса (в том числе
промежуточные), вместо того чтобы тянуть по копии на каждый вес. `font-style` — только
`normal`: курсивных начертаний в стилях нет.

## Файлы

| файл | семейство | подмножество | вес | размер |
|---|---|---|---:|---:|
| `manrope-cyrillic-ext.woff2` | Manrope | cyrillic-ext | 400 800 | 2,5 КБ |
| `manrope-cyrillic.woff2` | Manrope | cyrillic | 400 800 | 14,2 КБ |
| `manrope-greek.woff2` | Manrope | greek | 400 800 | 9,2 КБ |
| `manrope-vietnamese.woff2` | Manrope | vietnamese | 400 800 | 8,3 КБ |
| `manrope-latin-ext.woff2` | Manrope | latin-ext | 400 800 | 14,8 КБ |
| `manrope-latin.woff2` | Manrope | latin | 400 800 | 24,3 КБ |
| `unbounded-cyrillic-ext.woff2` | Unbounded | cyrillic-ext | 600 800 | 1,8 КБ |
| `unbounded-cyrillic.woff2` | Unbounded | cyrillic | 600 800 | 30,7 КБ |
| `unbounded-vietnamese.woff2` | Unbounded | vietnamese | 600 800 | 13,6 КБ |
| `unbounded-latin-ext.woff2` | Unbounded | latin-ext | 600 800 | 115,6 КБ |
| `unbounded-latin.woff2` | Unbounded | latin | 600 800 | 49,7 КБ |

Итого **284,5 КБ** на диске, в среднем **25,9 КБ** на файл. У Manrope 6 подмножеств,
у Unbounded 5 (греческого у него нет).

## Что оставлено и почему

В разметке и стилях реально используются только два семейства (`--font-display` и
`--font-body` в `src/styles.css`): **Unbounded** в заголовках, **Manrope** в тексте.
`Bebas Neue` подключался в `src/shell.html`, но нигде не используется — не скачивался.

Веса взяты из фактических `font-weight` в `src/styles.css`, лишних нет:

| семейство | веса | где встречаются |
|---|---|---|
| Manrope | 400, 500, 600, 700, 800 | 400 — базовый текст (`body`), 500 — `.pay__o small`, 600 — `.mod`, `.price small`, 700 — `.btn`, `.cart-line__n`, 800 — `.tier__badge`, `.status-pill` |
| Unbounded | 600, 700, 800 | 600 — `.ticker__row span`, 700 — `.item__name`, `.btn--brand`, 800 — `h1…h4`, `.price`, `.fact__n` |

## Сколько скачивает браузер

Подмножества разбиты по `unicode-range`, поэтому браузер берёт только те, чьи символы
встретились на странице. Для русской страницы это `cyrillic` + `latin`
(латиница нужна для «MADROCK», номеров, emoji-подписей):

| | файлов woff2 | на диске | скачивает русская страница (cyrillic + latin, все веса) |
|---|---:|---:|---:|
| было (имя с весом) | 45 | 1000,1 КБ | **433,3 КБ** — по копии на каждый вес, кэш между весами не работал |
| стало (диапазон веса) | 11 | 284,5 КБ | **118,8 КБ** — 14,2 + 24,3 КБ Manrope и 30,7 + 49,7 КБ Unbounded |

Экономия на телефоне — **314,5 КБ** на первой загрузке, при том же виде страницы и тех же
весах. `unbounded-latin-ext.woff2` (115,6 КБ) не скачивается: в русском тексте нет
символов из U+0100–02BA и т. п.

## Как это скачано (для повторяемости)

Google отдаёт woff2 только при современном User-Agent (иначе приходят ttf). Запрос:

```
GET https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@600;700;800&display=swap
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

Порядок действий при обновлении шрифтов:

1. запросить CSS с этим заголовком и разобрать блоки `@font-face` (подмножество —
   комментарий перед блоком: `/* cyrillic */` и т. п.);
2. скачать каждый `url(...)` с `fonts.gstatic.com`;
3. сгруппировать по «семейство + подмножество» и убедиться, что sha256 всех весов в группе
   совпадают и строки `unicode-range` идентичны (если вес отличается — оставить его
   отдельным блоком и отдельным файлом);
4. сохранить по одному файлу на группу под именем `<семейство>-<подмножество>.woff2`;
5. в `src/fonts.css` описать один блок `@font-face` на группу с диапазоном веса,
   `font-display: swap` и `unicode-range`, перенесённым из ответа Google без изменений.

## Проверка

```
node assets/fonts/verify-fonts.mjs
```

Скрипт падает с ненулевым кодом, если файл из `src/fonts.css` не найден, не начинается
с `wOF2`, потерял `unicode-range` или `font-display: swap`, объявлен без диапазона веса,
назван не по схеме «семейство-подмножество», а также если в папке есть лишний woff2 или
два файла побайтово совпадают.

## Лицензии

Оба семейства распространяются по лицензии **SIL Open Font License 1.1** (текст — в
`OFL-manrope.txt` и `OFL-unbounded.txt`), которая разрешает использование, изменение и
встраивание шрифтов, в том числе на коммерческом сайте, при сохранении текста лицензии.

Первоисточники:

- Manrope: <https://fonts.google.com/specimen/Manrope> · <https://github.com/google/fonts/tree/main/ofl/manrope> · <https://github.com/sharanda/manrope>
- Unbounded: <https://fonts.google.com/specimen/Unbounded> · <https://github.com/google/fonts/tree/main/ofl/unbounded> · <https://github.com/googlefonts/unbounded>
- Тексты лицензий: <https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt> и <https://raw.githubusercontent.com/google/fonts/main/ofl/unbounded/OFL.txt>
