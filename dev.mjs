// 写作模式：改文件自动重建 + 浏览器自动刷新
//   node dev.mjs
// 打开 http://127.0.0.1:4321 ，在编辑器里保存 .md，页面会自己刷新。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const RELOAD_SNIPPET = `<script>
(function(){
  try {
    var es = new EventSource('/__reload');
    es.onmessage = function(){ location.reload(); };
  } catch (e) {}
})();
</script>`;

/* ---------------- 构建 ---------------- */

let building = false;
let queued = false;
let lastResult = 'idle';

async function runBuild(reason = 'init') {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  const t0 = Date.now();
  try {
    // 加时间戳绕开 ESM 模块缓存，保证每次都是新代码
    await import(`./build.mjs?t=${Date.now()}`);
    lastResult = `ok ${Date.now() - t0}ms`;
    console.log(`  ↻ 已重建（${reason}，${Date.now() - t0}ms）`);
  } catch (err) {
    lastResult = `error`;
    console.error('\n  ✗ 构建失败：');
    console.error(String(err.stack || err.message).split('\n').slice(0, 6).join('\n'));
  } finally {
    building = false;
    if (queued) {
      queued = false;
      runBuild('排队中的改动');
      return;
    }
    broadcast();
  }
}

/* ---------------- 自动刷新 ---------------- */

const clients = new Set();

function broadcast() {
  for (const res of clients) {
    try {
      res.write(`data: ${lastResult}\n\n`);
    } catch (e) {
      clients.delete(res);
    }
  }
}

/* ---------------- 监听文件 ---------------- */

const watchTargets = ['posts', 'pages', 'assets', 'lib', 'static'];
let timer = null;

for (const dir of watchTargets) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  fs.watch(full, { recursive: true }, (event, file) => {
    if (file && /(~$|\.swp$|\.tmp$)/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => runBuild(`${dir}/${file || ''}`), 120);
  });
}

fs.watch(ROOT, (event, file) => {
  if (!file || !/^(site\.config\.mjs|build\.mjs)$/.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => runBuild(file), 120);
});

/* ---------------- 静态服务 ---------------- */

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  let file = path.join(OUT, pathname);
  if (!file.startsWith(OUT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(OUT, '404.html');

  const ext = path.extname(file).toLowerCase();
  const isHtml = ext === '.html';
  const status = isHtml && file.endsWith('404.html') ? 404 : 200;

  if (isHtml) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</body>', `${RELOAD_SNIPPET}\n</body>`);
    res.writeHead(status, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }

  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, async () => {
  console.log(`\n  ✦ 写作模式：http://${HOST}:${PORT}/`);
  console.log(`  ✦ 修改 posts/ 里的 .md，保存后页面自动刷新`);
  console.log(`  ✦ Ctrl+C 停止\n`);
  await runBuild('首次构建');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`端口 ${PORT} 被占用：$env:PORT=4322; node dev.mjs`);
  else console.error(err);
  process.exit(1);
});
