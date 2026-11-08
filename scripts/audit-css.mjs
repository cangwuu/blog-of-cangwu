// 找出 CSS 里定义过、但页面和 JS 都没用到的类名
// 用法：node scripts/audit-css.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 页面上实际出现的 class
const used = new Set();
const htmlFiles = walk(path.join(ROOT, 'public')).filter((f) => f.endsWith('.html'));
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    m[1].split(/\s+/).forEach((c) => c && used.add(c));
  }
}

// JS 里动态加上的 class（含 static/ 下的小应用）
for (const f of [path.join(ROOT, 'assets/app.js')]) {
  if (!fs.existsSync(f)) continue;
  const js = fs.readFileSync(f, 'utf8');
  for (const m of js.matchAll(/['"]\.?([a-z][a-z0-9-]*(?:__[a-z0-9-]+)?)['"]/gi)) used.add(m[1]);
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle)\(['"]([^'"]+)['"]/g)) used.add(m[1]);
  for (const m of js.matchAll(/className\s*=\s*['"]([^'"]+)['"]/g)) {
    m[1].split(/\s+/).forEach((c) => c && used.add(c));
  }
}

const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');

// 抓出 .foo / .foo-bar / .foo__bar 形式的类选择器
const classSel = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) classSel.add(m[1]);

const dead = [...classSel].filter((c) => !used.has(c)).sort();

// 统计每个死类出现在哪些行
const lines = css.split('\n');
const detail = dead.map((c) => {
  const found = [];
  lines.forEach((l, i) => {
    if (new RegExp(`\\.${c}(?![\\w-])`).test(l)) found.push(i + 1);
  });
  return { name: c, lines: found };
});

console.log('CSS 类选择器总数:', classSel.size);
console.log('页面/JS 中未出现的:', dead.length, '\n');
for (const d of detail) console.log(`  .${d.name}  → 行 ${d.lines.slice(0, 6).join(', ')}`);
