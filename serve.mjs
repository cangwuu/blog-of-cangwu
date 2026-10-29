// 本地预览服务器：node serve.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
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

if (!fs.existsSync(ROOT)) {
  console.error('找不到 public/，先运行：node build.mjs');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  let file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, '404.html');

  const ext = path.extname(file).toLowerCase();
  const isHtml = ext === '.html';
  const status = isHtml && file.endsWith('404.html') ? 404 : 200;

  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=0, must-revalidate',
  });
  fs.createReadStream(file).pipe(res);

  const time = new Date().toTimeString().slice(0, 8);
  console.log(`  ${time}  ${status}  ${pathname}`);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ✦ 本地预览：http://${HOST}:${PORT}/`);
  console.log(`  ✦ 目录：${ROOT}`);
  console.log(`  ✦ Ctrl+C 停止\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`端口 ${PORT} 被占用，换一个：$env:PORT=4322; node serve.mjs`);
  else console.error(err);
  process.exit(1);
});
