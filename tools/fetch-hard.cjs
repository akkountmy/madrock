// Fetch pages that block generic crawlers, with a browser-like UA, into a folder.
// Usage: node fetch-hard.cjs <outDir> <url> [url...]
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

(async () => {
  const outDir = process.argv[2];
  fs.mkdirSync(outDir, { recursive: true });
  for (const u of process.argv.slice(3)) {
    const name = u.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 60) + '.html';
    const file = path.join(outDir, name);
    try {
      const r = await fetch(u, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });
      const t = await r.text();
      fs.writeFileSync(file, t, 'utf8');
      console.log(`${r.status}\t${t.length}\t${u}\t-> ${file}`);
    } catch (e) {
      console.log(`ERR\t0\t${u} :: ${e.message}`);
    }
  }
})();
