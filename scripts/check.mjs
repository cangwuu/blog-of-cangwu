// 构建后自检：断链、残留占位符、结构统计
// 用法：node scripts/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public');

if (!fs.existsSync(OUT)) {
  console.error('没有 public/，先运行：node build.mjs');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(OUT);

const htmls = files.filter((f) => f.endsWith('.html'));
const exists = (p) => fs.existsSync(p) || fs.existsSync(path.join(p, 'index.html'));

let broken = 0;
let suspicious = 0;
const stats = { 页面: htmls.length, 表格: 0, 代码块: 0, 引用: 0, 列表: 0, 标题: 0 };

for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(OUT, f);

  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const target = decodeURIComponent(m[1].split('?')[0]);
    if (!exists(path.join(OUT, target))) {
      console.log(`  ✗ 断链  ${rel} → ${target}`);
      broken++;
    }
  }

  // 只抓真正漏出来的值，忽略代码里本来就有的 'undefined' 字符串
  for (const re of [/(?<!['"])\bundefined\b/, /\bNaN\b/, /\[object Object\]/]) {
    if (re.test(html)) {
      console.log(`  ! 可疑输出  ${rel} :: ${re}`);
      suspicious++;
    }
  }

  stats.表格 += (html.match(/<table/g) || []).length;
  stats.代码块 += (html.match(/class="code-block/g) || []).length;
  stats.引用 += (html.match(/<blockquote/g) || []).length;
  stats.列表 += (html.match(/<ul>|<ol>/g) || []).length;
  stats.标题 += (html.match(/<h[23] /g) || []).length;
}

// search.json 可解析性
try {
  const s = JSON.parse(fs.readFileSync(path.join(OUT, 'search.json'), 'utf8'));
  stats.搜索条目 = s.length;
  if (s.some((x) => !x.url || !x.title)) {
    console.log('  ! search.json 有条目缺字段');
    suspicious++;
  }
} catch (e) {
  console.log('  ✗ search.json 解析失败：' + e.message);
  broken++;
}

console.log('\n  统计：', stats);
console.log(`  断链 ${broken} 条，可疑 ${suspicious} 处`);
process.exit(broken || suspicious ? 1 : 0);
