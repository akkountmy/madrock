// Download files over HTTPS using Node's own TLS stack.
// Usage: node getfile.cjs <outDir> <url> [name]
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

(async () => {
  const [outDir, url, nameArg] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const name = nameArg || url.split('/').pop().split('?')[0];
  const file = path.join(outDir, name);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 40000);
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': new URL(url).origin + '/' }, signal: ctrl.signal });
    clearTimeout(t);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
    console.log(`OK ${res.status} ${buf.length}b -> ${file}`);
  } catch (e) { console.log(`ERR ${url} :: ${e.message}`); }
})();
