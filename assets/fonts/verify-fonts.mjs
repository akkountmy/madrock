// Проверка локальных шрифтов: парсит src/fonts.css и утверждает, что каждый
// url(assets/fonts/*.woff2) реально лежит на диске, является настоящим woff2,
// объявлен с диапазоном веса, unicode-range и font-display: swap, а лишних
// файлов в папке нет. Имя файла обязано совпадать с «семейство-подмножество».
// Запуск: node assets/fonts/verify-fonts.mjs
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const fontDir = import.meta.dirname;
const root = path.resolve(fontDir, '..', '..');
const css = await readFile(path.join(root, 'src', 'fonts.css'), 'utf8');

const blocks = [...css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)].map((m) => {
  const body = m[2];
  const get = (n) => (body.match(new RegExp('(?:^|;|\\s)' + n + '\\s*:\\s*([^;]+);')) || [])[1]?.trim();
  return {
    subset: m[1],
    family: get('font-family')?.replace(/^['"]|['"]$/g, ''),
    weight: get('font-weight'),
    style: get('font-style'),
    display: get('font-display'),
    range: get('unicode-range'),
    url: (body.match(/url\(([^)]+)\)/) || [])[1],
    src: /url\([^)]+\)\s*format\('woff2'\)/.test(body),
  };
});

console.log(`fonts.css: ${blocks.length} блоков @font-face`);

const problems = [];
const seen = new Map();
const sizes = [];
let total = 0;

for (const b of blocks) {
  const tag = `${b.family} ${b.weight} «${b.subset}»`;
  const rel = b.url;
  if (!rel) { problems.push(`${tag}: нет url()`); continue; }
  if (/^(https?:)?\/\//.test(rel)) problems.push(`${tag}: абсолютный адрес ${rel}`);
  if (!rel.startsWith('assets/fonts/')) problems.push(`${tag}: неожиданный путь ${rel}`);
  if (!/^\d+\s+\d+$/.test(b.weight || '')) problems.push(`${tag}: font-weight="${b.weight}" — ожидался диапазон вида 400 800`);
  if (b.display !== 'swap') problems.push(`${tag}: font-display=${b.display}`);
  if (!b.range) problems.push(`${tag}: нет unicode-range`);
  if (!b.src) problems.push(`${tag}: src без format('woff2')`);

  const expect = `${(b.family || '').toLowerCase()}-${b.subset}.woff2`;
  if (path.basename(rel) !== expect) problems.push(`${tag}: имя файла ${path.basename(rel)} ≠ ${expect}`);

  const abs = path.join(root, rel);
  try {
    const st = await stat(abs);
    const buf = await readFile(abs);
    const head = buf.subarray(0, 4).toString('latin1');
    if (head !== 'wOF2') problems.push(`${rel}: магия "${head}" вместо wOF2`);
    const hash = createHash('sha256').update(buf).digest('hex');
    if (seen.has(hash)) problems.push(`${rel}: побайтово совпадает с ${seen.get(hash)} — файлы нужно объединить`);
    seen.set(hash, rel);
    total += st.size;
    sizes.push({ rel, size: st.size });
  } catch {
    problems.push(`${rel}: ФАЙЛ НЕ НАЙДЕН`);
  }
}

const dirFiles = (await readdir(fontDir)).filter((f) => f.endsWith('.woff2'));
const referenced = new Set(blocks.map((b) => path.basename(b.url)));
const orphans = dirFiles.filter((f) => !referenced.has(f));

const kb = (n) => (n / 1024).toFixed(1);
console.log(`woff2 на диске: ${dirFiles.length}, упомянуто в fonts.css: ${referenced.size}`);
console.log(`суммарный вес: ${kb(total)} КБ (${total} байт), в среднем ${kb(total / blocks.length)} КБ на файл`);
sizes.sort((a, b) => b.size - a.size);
console.log('по размеру:');
for (const s of sizes) console.log(`  ${kb(s.size).padStart(7)} КБ  ${s.rel}`);
for (const b of blocks) console.log(`  ${b.family} ${b.weight} · ${b.subset} · ${path.basename(b.url)}`);
if (orphans.length) problems.push('осиротевшие файлы: ' + orphans.join(', '));

const byFamily = {};
for (const b of blocks) (byFamily[b.family] ||= new Set()).add(b.subset);
const need = { Manrope: ['cyrillic', 'latin'], Unbounded: ['cyrillic', 'latin'] };
let mobile = 0;
for (const b of blocks) {
  if (need[b.family]?.includes(b.subset)) mobile += (await stat(path.join(root, b.url))).size;
}
console.log(`\nрусская страница (cyrillic + latin, все используемые веса): ${kb(mobile)} КБ`);
console.log('уникальных блобов:', seen.size, '| подмножеств по семействам:',
  Object.entries(byFamily).map(([f, s]) => `${f} — ${[...s].length}`).join(', '));

if (problems.length) {
  console.error('\nПРОБЛЕМЫ:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nOK: все @font-face ссылаются на существующие настоящие woff2 с диапазоном веса, '
  + 'unicode-range и font-display: swap; осиротевших файлов нет.');
