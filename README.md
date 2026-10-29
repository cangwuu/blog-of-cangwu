# 拾光记 · 一个零依赖的静态博客

Markdown 写东西，一条命令生成整站，扔到 Cloudflare Pages 就能访问。
不需要 `npm install`，没有 `node_modules`，整个项目只有 Node 内置模块。

## 快速开始

```bash
node build.mjs     # 生成到 public/
node serve.mjs     # 本地预览 http://localhost:4321
```

要求 Node 18 以上。

## 写一篇文章

在 `posts/` 里新建一个 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-10-29 21:00:00
tags: [随笔, 教程]
categories: 记录
excerpt: 显示在列表卡片里的一句话摘要。
---

正文用 Markdown 写就好。
```

保存后重新 `node build.mjs`，文章地址是：

```text
/2026/10/29/文件名/
```

可选字段：

| 字段 | 作用 |
| --- | --- |
| `cover` | 卡片封面图路径，例如 `/assets/cover.png` |
| `pinned: true` | 置顶 |
| `draft: true` | 草稿，默认不生成（`INCLUDE_DRAFTS=1` 可强制包含） |
| `updated` | 更新日期 |
| `slug` | 自定义 URL 里的文件名部分 |

独立页面放进 `pages/`，比如 `pages/about.md` → `/about/`。

## 目录结构

```text
blog/
├── site.config.mjs    站点配置（标题、域名、作者、导航、评论、统计）
├── build.mjs          生成器
├── serve.mjs          本地预览服务器
├── lib/md.mjs         Markdown 渲染
├── lib/tpl.mjs        HTML 模板
├── posts/             文章
├── pages/             独立页面
├── assets/            样式、脚本、图标
└── public/            生成结果（不要手改，也不建议提交）
```

## 改配置

所有能改的东西都在 `site.config.mjs`，改完重新构建即可：

- `title` / `subtitle` / `description`
- `url`：**上线前一定要改成你的真实域名**
- `author`：昵称、头像、简介、社交链接
- `nav`：顶部导航
- `comments`：giscus 评论（基于 GitHub Discussions，免费）
- `analytics`：Cloudflare Web Analytics 的 token
- `footer.icp`：备案号（如果你有）

## 部署到 Cloudflare Pages

1. 把仓库推到 GitHub；
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git；
3. 构建设置：

| 项 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `node build.mjs` |
| Build output directory | `public` |
| 环境变量 | `NODE_VERSION=22` |

4. 部署成功后，在 **Custom domains** 里绑定你的域名。

域名解析的完整流程（含 dpdns.org 把 NS 委派给 Cloudflare）写在文章
`posts/deploy-cloudflare-pages.md` 里。

> 也可以完全不接 Git：把 `public/` 目录直接拖到 Pages 的 *Direct Upload* 里，同样能用。

## 不用 Cloudflare 的话

`public/` 就是一堆纯静态文件，Netlify、Vercel、GitHub Pages、Nginx、对象存储都能直接放。

## 这个生成器不做什么

- 不做评论服务端（用 giscus）
- 不做全文搜索服务端（构建时生成 `search.json`，浏览器端过滤）
- 不做图片压缩、不接 CDN（交给托管平台）

保持简单，是为了十年后它还能跑。
