# 施工进度（暂存点）

> 暂停时间：2026-10-29 00:21
> 状态：**源码已就位，尚未跑过第一次构建**（`public/` 还是空的）

---

## 一句话说明

在 `E:\dsh\blog\` 里从零写了一个零依赖的静态博客生成器（Markdown 进、HTML 出），
配色、布局、URL 规则都对齐参考站（Hexo + Redefine 主题）的风格，
准备托管到 **Cloudflare Pages**，域名用 **dpdns.org** 的免费二级域名。

不需要 npm install —— 这台机器上没有 Node 的 PATH，也连不上外网，
所以整个项目只用了 Node 内置模块，构建时用绑定的 node 绝对路径跑。

---

## 已完成

| 文件 | 作用 | 状态 |
| --- | --- | --- |
| `site.config.mjs` | 站点配置（标题、域名、作者、导航、评论、统计） | ✅ 待填真实信息 |
| `lib/md.mjs` | Markdown 渲染器：标题/加粗/代码块/引用/嵌套列表/表格/锚点 | ✅ |
| `lib/tpl.mjs` | HTML 模板：head、顶栏、页脚、文章卡片、分页、目录 | ✅ |
| `build.mjs` | 生成器：读 `posts/` + `pages/`，输出首页/文章/归档/标签/404/RSS/sitemap/搜索索引 | ✅ 未运行 |
| `assets/style.css` | 主题样式，含深色模式、响应式、代码块、目录、搜索弹窗 | ✅ |
| `assets/app.js` | 交互：主题切换、移动菜单、搜索、代码复制、阅读进度、目录高亮 | ✅ |
| `assets/*.svg` | 头像、favicon、OG 封面 | ✅ |
| `posts/hello-world.md` | 示章 | ✅ |
| `posts/how-i-built-this-blog.md` | 讲这个站怎么搭的（对标参考站的同名文章） | ✅ |
| `posts/deploy-cloudflare-pages.md` | dpdns.org + Cloudflare Pages 部署全过程 | ✅ |
| `posts/markdown-guide.md` | Markdown 语法速查（兼渲染测试页） | ✅ |
| `_source.md` / `_struct.txt` | 从你给的网页存档里抽出来的原文和结构分析 | 参考用，可删 |

## 没做完

1. **第一次构建还没跑**，`build.mjs` 可能有语法或运行时错误要修；
2. `pages/about.md`（关于页）还没写；
3. `package.json`、`serve.mjs`（本地预览服务器）、`README.md` 还没写；
4. `how-i-built-this-blog.md` 里有一个占位链接 `[把博客挂到自己的域名上](#)`，要改成真实文章地址；
5. `site.config.mjs` 里的 `url`、作者名、头像、社交链接还是占位值；
6. 还没在浏览器里看过效果。

## 恢复方式

下次继续说「继续」即可。或者自己跑：

```powershell
# 用绑定的 Node（这台机器 PATH 里没有 node）
C:\Users\cangw\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe E:\dsh\blog\build.mjs
```

## 关键决策（已定，别再反复）

- **不采用 Hexo**：本机装不了依赖、也没网，无法验证；改用零依赖生成器，产物和 Hexo 一样是纯静态。
  文章 front matter 与 Hexo 兼容（`title` / `date` / `tags` / `categories`），以后想迁 Hexo 直接复制 `posts/`。
- **URL 规则**：`/年/月/日/标题/`，和参考站一致。
- **托管**：Cloudflare Pages，构建命令 `node build.mjs`，输出目录 `public`。
- **域名**：dpdns.org 只做注册，DNS 必须委派给 Cloudflare（DigitalPlat 面板不提供记录编辑）。
- **配色**：暖白纸感背景 + 墨绿强调色，深色模式跟随系统并可手动切换。

## 参考资料

- 参考站原文存档：`E:\edge chrome\关于我搭建网站的全过程与如何搭建一个像我这样的博客 ｜ Hyj的小站 (2026_10_29 00：15：08).html`
- 原站技术栈：Hexo + Redefine 主题 + GitHub Pages + GitHub Actions
- DigitalPlat 官方文档：NS 委派流程（`documents/tutorial/platform/1.3-connect-nameservers.md`）
