// Turn the Next.js static export (./out) into ./static-preview — a folder that opens
// directly from file:// (double-click), with the login page excluded.
//
// Run AFTER `next build --webpack` (webpack + publicPath:"auto" is what lets the export
// hydrate over file://). The npm script "preview:static" chains both.
//
// It: (1) copies out/ → static-preview/, (2) drops the login route, (3) relativizes
// /_next/ asset URLs per page depth, (4) injects a capture-phase navigation shim that
// turns app links + data-href rows into hard jumps to the right relative index.html
// (Next's client router can't fetch over file://), (5) writes an entry index.html.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "out");
const DEST = path.join(ROOT, "static-preview");

if (!fs.existsSync(SRC)) {
  console.error("Missing ./out — run `next build --webpack` first.");
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });
fs.rmSync(path.join(DEST, "login"), { recursive: true, force: true });

function shim(prefix) {
  return `<script>(function(){var P=${JSON.stringify(prefix)};function go(h){if(!h)return;h=h.split("#")[0].split("?")[0];var p=h.replace(/^\\//,"");if(p===""||p.charAt(p.length-1)==="/")p+="index.html";else if(!/\\.[a-z0-9]+$/i.test(p))p+="/index.html";window.location.href=P+p;}document.addEventListener("click",function(e){var t=e.target;var el=t.closest&&t.closest('a[href^="/"],[data-href^="/"]');if(!el)return;var h=el.getAttribute("href")||el.getAttribute("data-href");if(!h||h.charAt(1)==="/")return;e.preventDefault();e.stopImmediatePropagation();go(h);},true);}());</script>`;
}

let count = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith(".html")) process(p);
  }
}
function process(file) {
  const relDir = path.relative(DEST, path.dirname(file));
  const depth = relDir === "" ? 0 : relDir.split(path.sep).length;
  const prefix = depth === 0 ? "./" : "../".repeat(depth);
  let html = fs.readFileSync(file, "utf8");
  html = html.split('"/_next/').join(`"${prefix}_next/`);       // relativize asset roots only
  html = html.split('href="/favicon').join(`href="${prefix}favicon`);
  html = html.includes("</body>") ? html.replace("</body>", shim(prefix) + "</body>") : html + shim(prefix);
  fs.writeFileSync(file, html);
  count++;
}
walk(DEST);

// Entry page → customer list (login excluded).
fs.writeFileSync(path.join(DEST, "index.html"),
`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>WeCRM365 — Static Preview</title><meta http-equiv="refresh" content="0; url=./customers/index.html"/><style>body{font-family:Inter,-apple-system,sans-serif;background:#f8fafc;color:#3C3833;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}</style></head><body>Opening WeCRM365… <a href="./customers/index.html" style="margin-left:6px;color:#3C3833;font-weight:700">open customer list</a></body></html>\n`);

console.log(`static-preview ready: ${count} pages relativized + shimmed, login excluded.`);
