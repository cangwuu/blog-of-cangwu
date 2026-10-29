---
title: 关于我搭建网站的全过程，以及如何搭建一个像这样的博客
date: 2026-10-27 20:10:00
tags: [教程, 博客, Cloudflare]
categories: 记录
excerpt: 从一台裸机到 https://cangwu.dpdns.org 能打开，中间到底发生了什么？这篇把每一步都写下来。
---

这篇文章回答两个问题：**我为什么这样搭**，以及**你照抄能不能搭出来**。

如果你只是想要结果，直接跳到最后一节，三条命令就能跑起来。

## 先说结论

这个站的全部家当就是：

| 组成 | 用了什么 | 花钱吗 |
| --- | --- | --- |
| 内容 | Markdown 文件 | 不花 |
| 生成 | 一个 300 行的 Node 脚本 | 不花 |
| 托管 | Cloudflare Pages | 不花 |
| 域名 | DigitalPlat 免费二级域名（dpdns.org） | 不花 |
| HTTPS | Cloudflare 自动签发 | 不花 |

整站没有一个运行时依赖，`node build.mjs` 一跑，`public/` 里就是可以直接上传的一堆静态文件。

## 为什么不直接用 Hexo

我最早也是照着 Hexo 教程来的：装 `hexo-cli`，`hexo init`，再挑一个主题（很多人用 Redefine、Butterfly），最后推到 GitHub Pages。

这条路的优点是**生态成熟**，缺点是：

1. 主题一升级，配置项就改名，改半天；
2. 一个博客装两百多个 npm 包，为了输出十几个 HTML；
3. 想改一个详情页的排版，得先去读主题源码。

我后来发现，我真正需要的功能只有：**Markdown 进，HTML 出，带标签、归档和搜索**。这些加起来不到四百行代码。

> 不是 Hexo 不好，是我要的东西太少了。

当然，如果你更喜欢主题生态，Hexo 那条路完全可行，我在文末也留了说明。

## 目录结构

```text
blog/
├── site.config.mjs     # 站点配置：标题、域名、作者、导航
├── build.mjs           # 生成器：读 posts/，写 public/
├── lib/
│   ├── md.mjs          # Markdown 渲染
│   └── tpl.mjs         # HTML 模板
├── posts/              # 文章，一篇一个 .md
│   ├── hello-world.md
│   └── 2026-10-27-....
├── pages/              # 独立页面（关于、友链……）
├── assets/             # 样式、脚本、头像
└── public/             # 生成结果，不要手改
```

## 写作流程

新建一篇文章，就是在 `posts/` 里丢一个 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-10-27 20:10:00
tags: [随笔, 教程]
excerpt: 显示在列表里的一句话摘要。
---

正文从这里开始。
```

然后：

```bash
node build.mjs     # 生成
node serve.mjs     # 本地预览 http://localhost:4321
```

改完刷新页面就能看到，不需要重启，也没有缓存捣乱。

## 固定链接

我特意把 URL 做成了 `/年/月/日/标题/` 的形式，和大多数 Hexo 站一样：

```text
https://cangwu.dpdns.org/2026/10/27/how-i-built-this-blog/
```

好处是链接自带时间信息，以后就算换掉生成器，URL 也不用改，别人的收藏和搜索引擎的记录都不会失效。

## 域名和部署

这部分单独写了一篇：[把博客挂到自己的域名上](/2026/10/28/deploy-cloudflare-pages/)。核心就两步：域名把 NS 交给 Cloudflare，Pages 里绑自定义域名。

## 想换成 Hexo？

也完全可以。这个仓库的 `posts/*.md` 的 front matter 是 Hexo 兼容的（`title` / `date` / `tags` / `categories`），把 `posts/` 复制进 `hexo/source/_posts/` 就能直接用。

差别只有一处：Hexo 的构建发生在服务器上，你要多装一堆依赖。
