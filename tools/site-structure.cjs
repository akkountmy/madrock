// Fetch coffee-brand homepages and extract real structure signals:
// title, meta description, nav labels, heading outline, buttons, keyword hits.
// Usage: node site-structure.cjs <outDir> <urlsFile>
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decode(buf, ct) {
  const m = /charset=["']?([\w-]+)/i.exec(ct || '');
  let cs = m ? m[1].toLowerCase() : 'utf-8';
  if (cs === 'windows-1251' || cs === 'cp1251') cs = 'windows-1251';
  if (cs === 'koi8-r') cs = 'koi8-r';
  try { return new TextDecoder(cs).decode(buf); }
  catch { return new TextDecoder('utf-8').decode(buf); }
}

function text(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'").replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ').trim();
}

const KEYWORDS = [
  ['loyalty/rewards', /loyalt|reward|points|star|балл|бонус/i],
  ['order/pickup', /order\s*(ahead|online|now)|pick\s*-?up|pickup|click\s*&?\s*collect|самовывоз|предзаказ/i],
  ['subscription', /subscription|subscribe|подписк/i],
  ['app', /\bapp\b|ios|android/i],
  ['menu', /\bmenu\b|меню/i],
  ['locations/stores', /locations?|stores?|find us|адрес|кофейн/i],
  ['shop/beans', /shop|beans|roast|merch|купить|зерн/i],
  ['about/story', /about|our story|story|philosophy|о нас/i],
  ['wholesale/b2b', /wholesale|b2b|опт/i],
  ['careers', /careers|jobs|hiring|ваканс/i],
];

(async () => {
  const outDir = process.argv[2];
  const urlsFile = process.argv[3];
  fs.mkdirSync(path.join(outDir, '_raw'), { recursive: true });
  const urls = fs.readFileSync(urlsFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const index = [];

  const queue = urls.map((u, i) => ({ u, i }));
  async function worker() {
    while (queue.length) {
      const { u, i } = queue.shift();
      const name = String(i).padStart(2, '0') + '-' + u.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 50) + '.txt';
      const file = path.join(outDir, name);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 40000);
        const res = await fetch(u, {
          headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8', 'Accept': 'text/html,application/xhtml+xml' },
          redirect: 'follow', signal: ctrl.signal,
        });
        clearTimeout(t);
        const buf = Buffer.from(await res.arrayBuffer());
        const html = decode(buf, res.headers.get('content-type'));
        fs.writeFileSync(path.join(outDir, '_raw', name.replace(/\.txt$/, '.html')), html, 'utf8');

        const out = [];
        out.push(`URL: ${u}`);
        out.push(`FINAL: ${res.url}`);
        out.push(`STATUS: ${res.status}`);
        out.push(`BYTES: ${buf.length}`);

        const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
        out.push(`TITLE: ${title ? text(title[1]) : '-'}`);
        const desc = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)
          || /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html);
        out.push(`DESC: ${desc ? text(desc[1]) : '-'}`);
        const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i.exec(html);
        out.push(`OG_TITLE: ${og ? text(og[1]) : '-'}`);

        // generator / platform
        const gen = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i.exec(html);
        const shopify = /cdn\.shopify\.com|Shopify\.theme/i.test(html) ? 'Shopify' : '';
        const framer = /framerusercontent|framer\.com/i.test(html) ? 'Framer' : '';
        const webflow = /webflow/i.test(html) ? 'Webflow' : '';
        const sq = /squarespace/i.test(html) ? 'Squarespace' : '';
        const wp = /wp-content|wp-includes/i.test(html) ? 'WordPress' : '';
        const next = /__NEXT_DATA__|\/_next\//i.test(html) ? 'Next.js' : '';
        out.push(`PLATFORM: ${[...new Set([shopify, framer, webflow, sq, wp, next])].filter(Boolean).join(', ') || (gen ? text(gen[1]) : '?')}`);

        // fonts
        const fonts = [...html.matchAll(/font-family\s*:\s*([^;"'}]+)/gi)].map(m => text(m[1])).filter(Boolean);
        const gf = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&:]+)/gi)].map(m => decodeURIComponent(m[1].replace(/\+/g, ' ')));
        const adobe = [...html.matchAll(/use\.typekit\.net\/([a-z0-9]+)\.css/gi)].map(m => 'typekit:' + m[1]);
        out.push(`FONTS_GOOGLE: ${[...new Set(gf)].join(' | ') || '-'}`);
        out.push(`FONTS_TYPekit: ${[...new Set(adobe)].join(' | ') || '-'}`);

        // heading outline
        const heads = [...html.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
          .map(m => `${m[1].toUpperCase()}: ${text(m[2])}`).filter(s => s.length > 5);
        out.push(`\n=== HEADING OUTLINE (${heads.length}) ===`);
        out.push(heads.slice(0, 120).join('\n') || '-');

        // nav labels
        const navBlocks = [...html.matchAll(/<(nav|header)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]).join('\n');
        const navLinks = [...navBlocks.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
          .map(m => text(m[1])).filter(s => s && s.length < 40);
        out.push(`\n=== NAV/HEADER LINK LABELS ===`);
        out.push([...new Set(navLinks)].slice(0, 60).join(' | ') || '-');

        // buttons & cta
        const btns = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m => text(m[1])).filter(Boolean);
        const bigCta = [...html.matchAll(/class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]{0,80}?)</gi)].map(m => text(m[1])).filter(s => s.length > 2 && s.length < 50);
        out.push(`\n=== BUTTONS / CTA TEXTS ===`);
        out.push([...new Set([...btns, ...bigCta])].slice(0, 60).join(' | ') || '-');

        // keyword hits with sample context
        out.push(`\n=== KEYWORD HITS ===`);
        const plain = text(html);
        for (const [label, re] of KEYWORDS) {
          const m = plain.match(re);
          if (m) {
            const at = plain.search(re);
            out.push(`[+] ${label}: ...${plain.slice(Math.max(0, at - 70), at + 90)}...`);
          } else out.push(`[-] ${label}`);
        }

        // visible text sample
        out.push(`\n=== VISIBLE TEXT (first 4000 chars) ===`);
        out.push(plain.slice(0, 4000));

        fs.writeFileSync(file, out.join('\n'), 'utf8');
        index.push(`${name}\t${res.status}\t${plain.length}\t${res.url}`);
      } catch (e) {
        fs.writeFileSync(file, `URL: ${u}\nERROR: ${e.message}\n`, 'utf8');
        index.push(`${name}\tERR\t0\t${u} :: ${e.message}`);
      }
    }
  }
  await Promise.all([0, 1, 2, 3, 4].map(worker));
  fs.writeFileSync(path.join(outDir, '_index.txt'), index.sort().join('\n'), 'utf8');
  console.log(index.sort().join('\n'));
})();
