// Analyse a locally saved HTML file with the same signals as site-structure.cjs.
// Usage: node analyse-local.cjs <file.html> [file2.html ...]
const fs = require('fs');
const path = require('path');

function text(s) {
  return s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'").replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, ' ').trim();
}

const KEYWORDS = [
  ['loyalty/rewards', /loyalt|reward|points|балл|бонус/i],
  ['order/pickup', /order\s*(ahead|online|now)|pick\s*-?up|pickup|click\s*&?\s*collect|самовывоз|предзаказ/i],
  ['subscription', /subscription|subscribe|подписк/i],
  ['app', /\bapp\b|ios|android/i],
  ['menu', /\bmenu\b|меню/i],
  ['locations', /locations?|stores?|find us|адрес/i],
  ['shop/beans', /shop|beans|roast|merch|купить|зерн/i],
  ['about/story', /about|our story|philosophy|о нас/i],
  ['wholesale', /wholesale|b2b|опт/i],
  ['careers', /careers|jobs|hiring|ваканс/i],
];

for (const f of process.argv.slice(2)) {
  const html = fs.readFileSync(f, 'utf8');
  const out = ['### ' + path.basename(f), 'BYTES: ' + html.length];
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  out.push('TITLE: ' + (title ? text(title[1]) : '-'));
  const desc = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)
    || /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html);
  out.push('DESC: ' + (desc ? text(desc[1]) : '-'));
  const shopify = /cdn\.shopify\.com|Shopify\.theme/i.test(html) ? 'Shopify' : '';
  const framer = /framerusercontent/i.test(html) ? 'Framer' : '';
  const webflow = /webflow/i.test(html) ? 'Webflow' : '';
  const wp = /wp-content|wp-includes/i.test(html) ? 'WordPress' : '';
  const next = /__NEXT_DATA__|\/_next\//i.test(html) ? 'Next.js' : '';
  const nuxt = /__NUXT__|_nuxt\//i.test(html) ? 'Nuxt' : '';
  const wix = /wixstatic|wix\.com/i.test(html) ? 'Wix' : '';
  const tilda = /tilda|t396/i.test(html) ? 'Tilda' : '';
  out.push('PLATFORM: ' + ([shopify, framer, webflow, wp, next, nuxt, wix, tilda].filter(Boolean).join(', ') || '?'));

  const fonts = new Set();
  for (const m of html.matchAll(/["'(]([^"'()]*?\.(?:woff2|woff|otf|ttf))["')]/gi)) {
    const b = m[1].split('/').pop().replace(/\.(woff2|woff|otf|ttf)$/i, '');
    if (b.length < 60) fonts.add(b);
  }
  out.push('FONT_FILES: ' + ([...fonts].slice(0, 12).join(' | ') || '-'));
  out.push('FONTS_GOOGLE: ' + ([...new Set([...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&:]+)/gi)].map(m => decodeURIComponent(m[1].replace(/\+/g, ' '))))].join(' | ') || '-'));
  out.push('TYPEKIT: ' + ([...new Set([...html.matchAll(/typekit\.net\/([a-z0-9]+)/gi)].map(m => m[1]))].join(', ') || '-'));

  const heads = [...html.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[1].toUpperCase() + ': ' + text(m[2])).filter(s => s.length > 5);
  out.push('\n=== HEADING OUTLINE (' + heads.length + ') ===\n' + (heads.slice(0, 100).join('\n') || '-'));

  const navBlocks = [...html.matchAll(/<(nav|header)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]).join('\n');
  const navLinks = [...navBlocks.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m => text(m[1])).filter(s => s && s.length < 40);
  out.push('\n=== NAV LABELS ===\n' + ([...new Set(navLinks)].slice(0, 50).join(' | ') || '-'));

  const btns = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m => text(m[1])).filter(Boolean);
  out.push('\n=== BUTTONS ===\n' + ([...new Set(btns)].slice(0, 40).join(' | ') || '-'));

  const plain = text(html);
  out.push('\n=== KEYWORD HITS ===');
  for (const [label, re] of KEYWORDS) {
    const at = plain.search(re);
    out.push(at >= 0 ? '[+] ' + label + ': ...' + plain.slice(Math.max(0, at - 60), at + 80) + '...' : '[-] ' + label);
  }
  out.push('\n=== VISIBLE TEXT (4000) ===\n' + plain.slice(0, 4000));
  console.log(out.join('\n') + '\n');
}
