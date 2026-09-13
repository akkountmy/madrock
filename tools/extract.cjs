// Extract a window of plain text around a marker from a fetched HTML file.
// Usage: node extract.cjs <htmlFile> "<marker>" [charsBefore] [charsAfter] [occurrence]
const fs = require('fs');
const file = process.argv[2];
const marker = process.argv[3];
const before = +(process.argv[4] || 200);
const after = +(process.argv[5] || 2500);
const occ = +(process.argv[6] || 1);

let h = fs.readFileSync(file, 'utf8');
h = h
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'").replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/\s+/g, ' ');

let idx = -1, from = 0;
for (let i = 0; i < occ; i++) { idx = h.indexOf(marker, from); if (idx < 0) break; from = idx + 1; }
if (idx < 0) { console.log('MARKER NOT FOUND: ' + marker); process.exit(1); }
console.log(h.slice(Math.max(0, idx - before), idx + after));
