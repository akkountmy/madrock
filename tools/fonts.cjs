// Recover real font families + design tokens from fetched HTML/CSS.
// Usage: node fonts.cjs <dirWithHtml> [dirWithHtml2 ...]
const fs = require('fs');
const path = require('path');

const dirs = process.argv.slice(2);
const files = [];
for (const d of dirs) {
  for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) files.push(path.join(d, f));
}

for (const f of files.sort()) {
  const h = fs.readFileSync(f, 'utf8');
  const fonts = new Set();
  // woff2 / font file paths often embed the family name
  for (const m of h.matchAll(/["'(]([^"'()]*?\.(?:woff2|woff|otf|ttf))["')]/gi)) {
    const base = m[1].split('/').pop().replace(/\.(woff2|woff|otf|ttf)$/i, '');
    if (base.length < 60) fonts.add(base);
  }
  // css font-family declarations
  const ff = new Set();
  for (const m of h.matchAll(/font-family\s*:\s*([^;}"'<]{2,80})/gi)) {
    const v = m[1].trim().replace(/\\[0-9a-f]{1,6}\s?/gi, '').replace(/\s+/g, ' ');
    if (v && !/^(inherit|initial|unset|var\(|{{|\$)/i.test(v)) ff.add(v);
  }
  // typekit ids
  const tk = new Set([...h.matchAll(/typekit\.net\/([a-z0-9]+)/gi)].map(m => m[1]));
  // css vars that look like colours
  const vars = new Set();
  for (const m of h.matchAll(/--[a-z0-9-]{2,40}\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]{3,40}\))/gi)) {
    vars.add(m[0].replace(/\s+/g, ' ').slice(0, 60));
  }
  const radius = new Set([...h.matchAll(/border-radius\s*:\s*([^;}"'<]{1,24})/gi)].map(m => m[1].trim()));
  console.log('\n### ' + path.basename(f));
  console.log('FONT_FILES: ' + ([...fonts].slice(0, 14).join(' | ') || '-'));
  console.log('CSS_FAMILIES: ' + ([...ff].slice(0, 14).join(' | ') || '-'));
  console.log('TYPEKIT: ' + ([...tk].join(', ') || '-'));
  console.log('RADIUS: ' + ([...radius].slice(0, 12).join(' | ') || '-'));
  console.log('CSS_COLOR_VARS: ' + ([...vars].slice(0, 16).join(' | ') || '-'));
}
