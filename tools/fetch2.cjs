// Same as fetch.cjs but with full browser-like headers to get past simple bot walls.
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

function decode(buf, ct) {
  const m = /charset=([\w-]+)/i.exec(ct || '');
  let cs = m ? m[1].toLowerCase() : 'utf-8';
  if (cs === 'windows-1251' || cs === 'cp1251') cs = 'windows-1251';
  try { return new TextDecoder(cs).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n').map(l => l.trim()).filter(l => l.length > 1).join('\n');
}

(async () => {
  const outDir = process.argv[2], urlsFile = process.argv[3];
  fs.mkdirSync(outDir, { recursive: true });
  const urls = fs.readFileSync(urlsFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const index = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const name = String(i).padStart(2, '0') + '-' + url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 60) + '.txt';
    const file = path.join(outDir, name);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 40000);
      const res = await fetch(url, { headers: { ...HEADERS, Referer: new URL(url).origin + '/' }, redirect: 'follow', signal: ctrl.signal });
      clearTimeout(t);
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get('content-type') || '';
      const body = ct.includes('html') ? strip(decode(buf, ct)) : decode(buf, ct);
      fs.writeFileSync(file, `URL: ${url}\nFINAL: ${res.url}\nSTATUS: ${res.status}\n\n${body}`, 'utf8');
      index.push(`${name}\t${res.status}\t${body.length}`);
    } catch (e) {
      fs.writeFileSync(file, `URL: ${url}\nERROR: ${e.message}\n`, 'utf8');
      index.push(`${name}\tERR\t0 :: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
  fs.writeFileSync(path.join(outDir, '_index.txt'), index.join('\n'), 'utf8');
  console.log(index.join('\n'));
})();
