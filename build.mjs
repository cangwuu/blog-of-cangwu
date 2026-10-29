// 静态博客生成器：node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, escapeHtml as esc } from './lib/md.mjs';
import * as tpl from './lib/tpl.mjs';
import site from './site.config.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'public');
const TZ = '+08:00';

// 用样式和脚本的内容算一个短版本号，拼到 URL 后面，
// 这样既能长期缓存，换了内容浏览器又会立刻拿新的
{
  const h = crypto.createHash('sha1');
  for (const f of ['assets/style.css', 'assets/app.js']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
  }
  tpl.setAssetVersion(h.digest('hex').slice(0, 8));
}

/* ---------------- 工具 ---------------- */

function parseFrontMatter(raw) {
  const text = raw.replace(/\r\n?/g, '\n');
  if (!text.startsWith('---')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };
  const head = text.slice(3, end).trim();
  const body = text.slice(text.indexOf('\n', end + 1) + 1);
  const data = {};
  let key = null;
  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const arrItem = line.match(/^\s+-\s+(.*)$/);
    if (arrItem && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(unquote(arrItem[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const value = kv[2].trim();
    if (!value) {
      data[key] = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, body };
}

const unquote = (s) => String(s).trim().replace(/^["']|["']$/g, '');
const toArray = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

function parseDate(value) {
  const m = String(value || '').match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return { iso: new Date().toISOString(), date: new Date() };
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  const p = (n) => String(n).padStart(2, '0');
  const iso = `${y}-${p(mo)}-${p(d)}T${p(h)}:${mi}:${s}${TZ}`;
  return { iso, date: new Date(iso) };
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~_|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(markdown, max = 108) {
  const text = plainText(markdown).replace(/^(?:—+|\s)+/, '');
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/[,，、；;:：\s]+$/g, '') + '…';
}

function readingTime(markdown) {
  const text = plainText(markdown);
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}

const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
};

/* ---------------- 读取文章 ---------------- */

const postsDir = path.join(ROOT, 'posts');
const posts = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data, body } = parseFrontMatter(raw);
    const slug = data.slug || file.replace(/\.md$/, '');
    const { iso, date } = parseDate(data.date);
    const { html, toc } = renderMarkdown(body);
    const tags = toArray(data.tags).filter(Boolean);
    const excerpt = data.excerpt || data.description || makeExcerpt(body);
    const [yy, mm, dd] = iso.slice(0, 10).split('-');
    return {
      file,
      slug,
      // 和参考站一样的固定链接：/年/月/日/标题/
      url: `/${yy}/${mm}/${dd}/${encodeURIComponent(slug)}/`,
      outPath: `${yy}/${mm}/${dd}/${slug}/index.html`,
      title: data.title || slug,
      date,
      dateIso: iso,
      updatedIso: data.updated ? parseDate(data.updated).iso : iso,
      tags,
      categories: toArray(data.categories),
      cover: data.cover || '',
      excerpt,
      draft: data.draft === true,
      pinned: data.pinned === true,
      body,
      html,
      toc,
      readingTime: readingTime(body),
    };
  })
  .filter((p) => !p.draft || process.env.INCLUDE_DRAFTS)
  .sort((a, b) => b.date - a.date);

// 置顶优先
const sorted = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date - a.date);

const tagCounts = new Map();
for (const p of posts) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
const tags = [...tagCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

/* ---------------- 生成页面 ---------------- */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 首页分页
const perPage = site.postsPerPage || 8;
const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
for (let page = 1; page <= totalPages; page++) {
  const slice = sorted.slice((page - 1) * perPage, page * perPage);
  const socialLinks = (site.author?.links || [])
    .map(
      (l) =>
        `<a class="social-link" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>${tpl.icon(
          l.icon
        )}<span>${esc(l.name)}</span></a>`
    )
    .join('');

  const hero =
    page === 1 && site.hero?.enabled
      ? `<section class="hero"><div class="container hero-inner">
  <img class="hero-avatar" src="${esc(site.author?.avatar)}" alt="" width="96" height="96">
  <div class="hero-text">
    <p class="hero-greeting">${esc(site.hero.greeting || '你好，我是')}</p>
    <h1 class="hero-name">${esc(site.author?.name)}</h1>
    ${(site.hero.lines || []).map((l) => `<p class="hero-line">${esc(l)}</p>`).join('\n    ')}
    <div class="hero-links">${socialLinks}</div>
    <div class="hero-stats">
      <span><strong>${posts.length}</strong> 篇文章</span>
      <span class="sep"></span>
      <span><strong>${tags.length}</strong> 个标签</span>
      <span class="sep"></span>
      <span>更新于 ${tpl.formatDate(posts[0]?.dateIso || '', 'iso')}</span>
    </div>
  </div>
</div></section>`
      : '';

  const tagCloud =
    page === 1
      ? `<section class="container home-extra">
  <div class="extra-head">
    <h2>标签</h2>
    <a class="section-more" href="/tags/">全部标签 ${tpl.icon('arrowRight')}</a>
  </div>
  <div class="tag-cloud tag-cloud-lg">
    ${tags.map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t.name)}/">${esc(t.name)}<em>${t.count}</em></a>`).join('\n    ')}
  </div>
</section>`
      : '';

  const content = `${hero}
<section class="container home-main">
  <div class="section-head">
    <h2>${page === 1 ? '最新文章' : `第 ${page} 页`}</h2>
    <a class="section-more" href="/archives/">全部归档 ${tpl.icon('arrowRight')}</a>
  </div>
  <div class="post-grid">
    ${slice.map(tpl.postCard).join('\n    ') || '<p class="empty">还没有文章，去 posts/ 里写第一篇吧。</p>'}
  </div>
  ${tpl.pagination({ current: page, total: totalPages, base: '/' })}
</section>
${tagCloud}`;
  write(page === 1 ? 'index.html' : `page/${page}/index.html`, tpl.layout({
    site,
    title: page === 1 ? '' : `第 ${page} 页`,
    description: site.description,
    path: page === 1 ? '/' : `/page/${page}/`,
    bodyClass: 'page-home',
    content,
  }));
}

// 文章页
for (const post of posts) {
  const related = posts
    .filter((p) => p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, 3);
  const idx = posts.findIndex((p) => p.slug === post.slug);
  const newer = posts[idx - 1];
  const older = posts[idx + 1];
  // 评论需要 repoId / categoryId，缺一个就不渲染，避免页面上出现坏掉的框
  const commentsReady =
    site.comments?.enabled && site.comments.repoId && site.comments.categoryId;
  const comments = commentsReady
    ? `<section class="comments" id="comments">
  <h2 class="comments-title">评论</h2>
  <script src="https://giscus.app/client.js"
    data-repo="${esc(site.comments.repo)}"
    data-repo-id="${esc(site.comments.repoId)}"
    data-category="${esc(site.comments.category)}"
    data-category-id="${esc(site.comments.categoryId)}"
    data-mapping="${esc(site.comments.mapping || 'pathname')}"
    data-strict="0"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="bottom"
    data-theme="${esc(site.comments.theme || 'preferred_color_scheme')}"
    data-lang="zh-CN"
    crossorigin="anonymous" async>
  </script>
</section>`
    : '';

  const content = `<div class="container post-layout">
  <article class="post">
    ${post.cover ? `<img class="post-cover" src="${esc(post.cover)}" alt="" width="900" height="375" loading="eager" decoding="async">` : ''}
    <header class="post-header">
      ${post.tags.length ? `<div class="post-tags">${post.tags.map((t) => `<a class="tag tag-sm" href="/tags/${encodeURIComponent(t)}/">${esc(t)}</a>`).join('')}</div>` : ''}
      <h1 class="post-title">${esc(post.title)}</h1>
      <p class="post-excerpt">${esc(post.excerpt)}</p>
      <div class="post-meta">
        <time datetime="${post.dateIso}">${tpl.formatDate(post.dateIso, 'full')}</time>
        <span class="dot"></span><span>${post.readingTime} 分钟阅读</span>
        <span class="dot"></span><span>${plainText(post.body).length} 字</span>
        ${post.updatedIso !== post.dateIso ? `<span class="dot"></span><span>更新于 ${tpl.formatDate(post.updatedIso, 'iso')}</span>` : ''}
      </div>
    </header>
    <div class="post-body">${post.html}</div>
    <footer class="post-footer">
      ${post.tags.length ? `<div class="post-footer-tags">${post.tags.map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t)}/">#${esc(t)}</a>`).join('')}</div>` : ''}
      <nav class="post-nav">
        ${older ? `<a class="post-nav-item prev" href="${older.url}"><span>上一篇</span><strong>${esc(older.title)}</strong></a>` : '<span></span>'}
        ${newer ? `<a class="post-nav-item next" href="${newer.url}"><span>下一篇</span><strong>${esc(newer.title)}</strong></a>` : '<span></span>'}
      </nav>
    </footer>
    ${comments}
  </article>
  ${tpl.tocList(post.toc)}
</div>
${related.length ? `<section class="container related"><h2>相关文章</h2><div class="related-grid">${related.map(tpl.postCard).join('')}</div></section>` : ''}`;

  write(post.outPath, tpl.layout({
    site,
    title: post.title,
    description: post.excerpt,
    path: post.url,
    type: 'article',
    bodyClass: 'page-post',
    content,
    headExtra: `<meta property="article:published_time" content="${post.dateIso}">
<meta property="article:tag" content="${esc(post.tags.join(','))}">`,
  }));
}

// 归档
const byYear = new Map();
for (const p of posts) {
  const y = p.dateIso.slice(0, 4);
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(p);
}
const archiveContent = `<div class="container page-narrow">
  <header class="page-header">
    <h1>归档</h1>
    <p>共 ${posts.length} 篇，跨越 ${byYear.size} 个年份</p>
  </header>
  <div class="archive">
    ${[...byYear.entries()]
      .map(
        ([year, list]) => `<section class="archive-year">
      <h2 class="archive-year-title">${year}<span>${list.length} 篇</span></h2>
      <ul class="archive-list">
        ${list
          .map(
            (p) => `<li><time datetime="${p.dateIso}">${p.dateIso.slice(5, 10).replace('-', '/')}</time><a href="${p.url}">${esc(
              p.title
            )}</a></li>`
          )
          .join('\n        ')}
      </ul>
    </section>`
      )
      .join('\n    ')}
  </div>
</div>`;
write('archives/index.html', tpl.layout({
  site, title: '归档', description: `${site.title}的全部文章归档`, path: '/archives/', bodyClass: 'page-archive', content: archiveContent,
}));

// 标签总览
const tagsContent = `<div class="container page-narrow">
  <header class="page-header"><h1>标签</h1><p>${tags.length} 个标签，${posts.length} 篇文章</p></header>
  <div class="tag-cloud tag-cloud-lg">
    ${tags.map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t.name)}/">${esc(t.name)}<em>${t.count}</em></a>`).join('\n    ')}
  </div>
</div>`;
write('tags/index.html', tpl.layout({
  site, title: '标签', description: `${site.title}的全部标签`, path: '/tags/', bodyClass: 'page-tags', content: tagsContent,
}));

// 单个标签
for (const t of tags) {
  const list = posts.filter((p) => p.tags.includes(t.name));
  const content = `<div class="container page-narrow">
  <header class="page-header">
    <p class="page-kicker">标签</p>
    <h1>${esc(t.name)}</h1>
    <p>${t.count} 篇文章</p>
  </header>
  <div class="post-list">${list.map(tpl.postCard).join('\n  ')}</div>
  <p class="back-link"><a href="/tags/">${tpl.icon('arrowLeft')} 返回全部标签</a></p>
</div>`;
  write(`tags/${t.name}/index.html`, tpl.layout({
    site, title: `标签：${t.name}`, description: `标签 ${t.name} 下的全部文章`, path: `/tags/${encodeURIComponent(t.name)}/`, bodyClass: 'page-tag', content,
  }));
}

// 独立页面（关于等）
const pagesDir = path.join(ROOT, 'pages');
if (fs.existsSync(pagesDir)) {
  for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    const { data, body } = parseFrontMatter(raw);
    const slug = data.slug || file.replace(/\.md$/, '');
    const { html, toc } = renderMarkdown(body);
    const content = `<div class="container post-layout">
  <article class="post">
    <header class="post-header">
      <h1 class="post-title">${esc(data.title || slug)}</h1>
      ${data.subtitle ? `<p class="post-excerpt">${esc(data.subtitle)}</p>` : ''}
    </header>
    <div class="post-body">${html}</div>
  </article>
  ${tpl.tocList(toc)}
</div>`;
    write(`${slug}/index.html`, tpl.layout({
      site, title: data.title || slug, description: data.description || site.description, path: `/${slug}/`, bodyClass: 'page-page', content,
    }));
  }
}

// 友链
const friends = site.friends || [];
const friendCard = (f) => {
  let hue = 0;
  for (const ch of f.name) hue = (hue * 31 + ch.codePointAt(0)) % 360;
  const avatar = f.avatar
    ? `<img class="friend-avatar" src="${esc(f.avatar)}" alt="" width="44" height="44" loading="lazy">`
    : `<span class="friend-avatar friend-avatar-ph" style="--h:${hue}" aria-hidden="true">${esc(
        f.name.slice(0, 1)
      )}</span>`;
  return `<a class="friend-card" href="${esc(f.url)}" target="_blank" rel="noopener">
    ${avatar}
    <span class="friend-info"><strong>${esc(f.name)}</strong><span>${esc(f.desc || '')}</span></span>
  </a>`;
};

write('links/index.html', tpl.layout({
  site,
  title: '友链',
  description: `${site.title}的友链`,
  path: '/links/',
  bodyClass: 'page-links',
  content: `<div class="container page-narrow">
  <header class="page-header">
    <h1>友链</h1>
    <p>${friends.length} 个站点</p>
  </header>
  <div class="friend-grid">
    ${friends.map(friendCard).join('\n    ') || '<p class="empty">还没有友链。</p>'}
  </div>

  <section class="friend-apply">
    <h2>交换友链</h2>
    <p>在任意一篇文章底部留言，把站名、地址和一句话介绍发给我就行。</p>
    <p>下面是本站信息，方便你回链：</p>
    <figure class="code-block"><figcaption><span>本站信息</span></figcaption><pre><code>名称：${esc(
      site.title
    )}
地址：${esc(site.url)}/
头像：${esc(site.url)}/assets/avatar.jpg
简介：${esc(site.subtitle || site.description)}</code></pre></figure>
  </section>
</div>`,
}));

// 404
write('404.html', tpl.layout({
  site, title: '页面走丢了', description: '404', path: '/404.html', bodyClass: 'page-404',
  content: `<div class="container notfound">
  <p class="notfound-code">404</p>
  <h1>这页好像不存在了</h1>
  <p>可能是链接输错了，或者这篇文章已经被我删掉。</p>
  <div class="notfound-actions">
    <a class="btn" href="/">回到首页</a>
    <a class="btn btn-ghost" href="/archives/">看看归档</a>
  </div>
</div>`,
}));

// 搜索索引
write('search.json', JSON.stringify(
  posts.map((p) => ({
    title: p.title,
    url: p.url,
    date: p.dateIso.slice(0, 10),
    tags: p.tags,
    excerpt: p.excerpt,
    text: plainText(p.body).slice(0, 600),
  }))
));

// RSS
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${site.url}/</link>
    <description>${esc(site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(posts[0]?.dateIso || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .slice(0, 20)
      .map(
        (p) => `<item>
      <title>${esc(p.title)}</title>
      <link>${site.url}${p.url}</link>
      <guid isPermaLink="true">${site.url}${p.url}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
      ${p.tags.map((t) => `<category>${esc(t)}</category>`).join('\n      ')}
    </item>`
      )
      .join('\n    ')}
  </channel>
</rss>`;
write('feed.xml', feed);

// sitemap
const urls = [
  { loc: '/', lastmod: posts[0]?.updatedIso },
  ...posts.map((p) => ({ loc: p.url, lastmod: p.updatedIso })),
  { loc: '/archives/' }, { loc: '/tags/' }, { loc: '/toys/' }, { loc: '/links/' }, { loc: '/about/' }, { loc: '/reactor/' },
  ...tags.map((t) => ({ loc: `/tags/${encodeURIComponent(t.name)}/` })),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${site.url}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`
  )
  .join('\n')}
</urlset>`);

write('robots.txt', `User-agent: *
Allow: /
Sitemap: ${site.url}/sitemap.xml
`);

// 静态资源
// 以 _ 或 IMG_ 开头的文件（草稿、手机原图）不复制；超过 1.5MB 的原图也跳过，避免把几兆的原片推上线
const MAX_ASSET = 1.5 * 1024 * 1024;
const skippedAssets = [];

function copyAssets(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const base = entry.name;
    if (base.startsWith('_') || base.startsWith('IMG_')) continue;
    const src = path.join(from, base);
    const dst = path.join(to, base);
    if (entry.isDirectory()) {
      copyAssets(src, dst);
      continue;
    }
    const size = fs.statSync(src).size;
    if (size > MAX_ASSET) {
      skippedAssets.push(`${path.relative(ROOT, src)}（${(size / 1024 / 1024).toFixed(1)} MB）`);
      continue;
    }
    fs.copyFileSync(src, dst);
  }
}

const assetsDir = path.join(ROOT, 'assets');
if (fs.existsSync(assetsDir)) {
  copyAssets(assetsDir, path.join(OUT, 'assets'));
  if (skippedAssets.length) {
    console.log('\n  ⚠ 以下文件太大，没有复制到站点：');
    skippedAssets.forEach((s) => console.log(`     - ${s}`));
    console.log('     （先压缩成网页尺寸再引用）\n');
  }
}

// 静态页面（独立的小应用，比如 /reactor/）
// static/ 下的东西按原样铺到站点根目录，不走 Markdown 渲染
const staticDir = path.join(ROOT, 'static');
if (fs.existsSync(staticDir)) {
  fs.cpSync(staticDir, OUT, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return !base.startsWith('_') && !base.startsWith('IMG_');
    },
  });
}

// Cloudflare Pages 设置
// 注意：规则按顺序合并，后面的会覆盖前面的同名字段
write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=86400
`);

write('_redirects', `/feed /feed.xml 301
/atom.xml /feed.xml 301
`);

/* ---------------- 输出结果 ---------------- */
console.log(`\n  ✦ 构建完成  ${posts.length} 篇文章 · ${tags.length} 个标签 · ${totalPages} 页首页`);
console.log(`  ✦ 输出目录  ${OUT}\n`);
