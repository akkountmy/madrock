// Fetch a URL and print regex matches with context (for digging into raw HTML/JSON).
// Usage: node probe.cjs <url> <regex> [contextChars]
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
};

(async () => {
  const [url, pattern, ctxArg] = process.argv.slice(2);
  const ctx = Number(ctxArg || 120);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || '';
    let text;
    const m = /charset=([\w-]+)/i.exec(ct);
    try { text = new TextDecoder(m ? m[1].toLowerCase() : 'utf-8').decode(buf); }
    catch { text = new TextDecoder('utf-8').decode(buf); }
    console.log(`URL: ${url}\nFINAL: ${res.url}\nSTATUS: ${res.status}\nCONTENT-TYPE: ${ct}\nLEN: ${text.length}\n--- matches ---`);
    const re = new RegExp(pattern, 'gi');
    let n = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      const start = Math.max(0, match.index - ctx);
      const end = Math.min(text.length, match.index + match[0].length + ctx);
      console.log(`[${++n}] ...${text.slice(start, end).replace(/\s+/g, ' ')}...`);
      if (n >= 40) { console.log('(capped at 40)'); break; }
    }
    if (n === 0) console.log('(no matches)');
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
})();
