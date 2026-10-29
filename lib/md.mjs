// 一个够用就好的 Markdown 渲染器（零依赖）
// 支持：标题 / 段落 / 粗斜体 / 行内代码 / 代码块 / 引用 / 有序无序列表（可嵌套）
//       表格 / 分割线 / 链接 / 图片 / 删除线 / 高亮 / 自动链接 / 首行缩进无需空格

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

/** 生成锚点 id，保留中英文与数字 */
export function slugify(str) {
  return (
    String(str)
      .toLowerCase()
      .trim()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\p{L}\p{N}\-_]/gu, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

function renderInline(text) {
  const store = [];
  const keep = (html) => `\u0000${store.push(html) - 1}\u0000`;

  let s = escapeHtml(text);

  // 行内代码
  s = s.replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${code}</code>`));

  // 图片
  s = s.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) =>
    keep(
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" decoding="async">`
    )
  );

  // 链接
  s = s.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, label, href, title) => {
    const external = /^https?:\/\//i.test(href);
    return keep(
      `<a href="${href}"${title ? ` title="${title}"` : ''}${
        external ? ' target="_blank" rel="noopener noreferrer"' : ''
      }>${label}</a>`
    );
  });

  // 裸链接
  s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, (m, pre, url) =>
    keep(`${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
  );

  // 强调
  s = s
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');

  // 还原占位符
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => store[Number(i)]);
}

const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^\s*([-*_])\s*(\1\s*){2,}$/;
const RE_QUOTE = /^\s*>\s?/;
const RE_LIST = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const RE_HTML_BLOCK = /^\s*<([a-zA-Z][\w-]*|!--)/;

function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * 渲染 Markdown
 * @param {string} src
 * @param {{toc?: boolean}} [opts]
 * @returns {{html: string, toc: Array<{level:number,id:string,text:string}>}}
 */
export function renderMarkdown(src, opts = {}) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const toc = [];
  const usedIds = new Map();
  let i = 0;

  const headingId = (text) => {
    const base = slugify(text);
    const n = usedIds.get(base) || 0;
    usedIds.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };

  const flushParagraph = (buf) => {
    if (!buf.length) return;
    out.push(`<p>${renderInline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
    buf.length = 0;
  };

  const para = [];

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) {
      flushParagraph(para);
      i++;
      continue;
    }

    // 代码块
    const fence = line.match(RE_FENCE);
    if (fence) {
      flushParagraph(para);
      const marker = fence[2][0];
      const lang = fence[3] || '';
      const code = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${marker}{3,}\\s*$`).test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // 跳过结束围栏
      const label = lang || 'text';
      out.push(
        `<figure class="code-block${lang ? ` lang-${escapeHtml(lang)}` : ''}">` +
          `<figcaption><span>${escapeHtml(label)}</span>` +
          `<button type="button" class="copy-btn" aria-label="复制代码">复制</button></figcaption>` +
          `<pre><code class="language-${escapeHtml(label)}">${escapeHtml(code.join('\n'))}</code></pre>` +
          `</figure>`
      );
      continue;
    }

    // 标题
    const h = line.match(RE_HEADING);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      const text = h[2];
      const id = headingId(text);
      if (level === 2 || level === 3) toc.push({ level, id, text: text.replace(/[*`_~=]/g, '') });
      out.push(
        `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${renderInline(
          text
        )}</h${level}>`
      );
      i++;
      continue;
    }

    // 分割线
    if (RE_HR.test(line)) {
      flushParagraph(para);
      out.push('<hr>');
      i++;
      continue;
    }

    // 引用
    if (RE_QUOTE.test(line)) {
      flushParagraph(para);
      const buf = [];
      while (i < lines.length && (RE_QUOTE.test(lines[i]) || (buf.length && lines[i].trim()))) {
        if (RE_QUOTE.test(lines[i])) buf.push(lines[i].replace(RE_QUOTE, ''));
        else buf.push(lines[i]);
        i++;
      }
      const inner = renderMarkdown(buf.join('\n'));
      out.push(`<blockquote>${inner.html}</blockquote>`);
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      flushParagraph(para);
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => {
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        return left && right ? 'center' : right ? 'right' : left ? 'left' : '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const cell = (tag, text, idx) =>
        `<${tag}${align[idx] ? ` style="text-align:${align[idx]}"` : ''}>${renderInline(text)}</${tag}>`;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head
          .map((c, idx) => cell('th', c, idx))
          .join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c, idx) => cell('td', c, idx)).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }

    // 列表
    if (RE_LIST.test(line)) {
      flushParagraph(para);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(RE_LIST);
        if (m) {
          items.push({
            indent: m[1].replace(/\t/g, '    ').length,
            ordered: /\d/.test(m[2]),
            text: [m[3]],
          });
          i++;
          // 惰性续行
          while (
            i < lines.length &&
            lines[i].trim() &&
            !RE_LIST.test(lines[i]) &&
            !RE_HEADING.test(lines[i]) &&
            !RE_FENCE.test(lines[i]) &&
            !RE_QUOTE.test(lines[i])
          ) {
            items[items.length - 1].text.push(lines[i].trim());
            i++;
          }
          continue;
        }
        // 列表之间的空行 + 后续仍是列表项
        if (!lines[i].trim() && i + 1 < lines.length && RE_LIST.test(lines[i + 1])) {
          i++;
          continue;
        }
        break;
      }

      const root = { indent: -1, children: [] };
      const stack = [root];
      for (const item of items) {
        while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop();
        const parent = stack[stack.length - 1];
        const node = { ...item, children: [] };
        parent.children.push(node);
        stack.push(node);
      }

      const renderNodes = (nodes) => {
        if (!nodes.length) return '';
        const ordered = nodes[0].ordered;
        const tag = ordered ? 'ol' : 'ul';
        const li = nodes
          .map(
            (n) =>
              `<li>${renderInline(n.text.join(' '))}${
                n.children.length ? renderNodes(n.children) : ''
              }</li>`
          )
          .join('');
        return `<${tag}>${li}</${tag}>`;
      };
      out.push(renderNodes(root.children));
      continue;
    }

    // 原始 HTML 块
    if (RE_HTML_BLOCK.test(line)) {
      flushParagraph(para);
      const buf = [];
      while (i < lines.length && lines[i].trim()) {
        buf.push(lines[i]);
        i++;
      }
      out.push(buf.join('\n'));
      continue;
    }

    para.push(line);
    i++;
  }

  flushParagraph(para);
  return { html: out.join('\n'), toc };
}
