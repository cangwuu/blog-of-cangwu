---
title: 把博客挂到自己的域名上（dpdns.org + Cloudflare Pages）
date: 2026-10-28 22:40:00
tags: [教程, Cloudflare, 域名]
categories: 记录
excerpt: 从 DigitalPlat 面板到 Cloudflare Pages 的自定义域名，一共八步，每一步都写清楚了。
pinned: true
cover: /assets/cover-deploy.jpg
---

手上的域名是一个 `dpdns.org` 的免费二级域名，托管用 Cloudflare Pages。这两样凑一起其实很顺，因为**它们都需要你把域名的 NS 交给 Cloudflare**。

下面是从零到能打开的全过程。

## 一、先搞清楚一件事

DigitalPlat（dpdns.org 的注册商）**不提供 DNS 记录编辑**，它只负责两件事：登记域名、把域名的 NS 委派给别处。

所以「在面板里加一条 CNAME」这个动作是不存在的。正确的顺序是：

```text
DigitalPlat 注册域名
      ↓  把 NS 改成 Cloudflare 给的两条
Cloudflare 接管这个域名的全部解析
      ↓  在 Cloudflare 里建 Pages 项目 + 绑域名
https://cangwu.dpdns.org
```

## 二、在 Cloudflare 添加站点

1. 登录 Cloudflare，右上角 **Add a site**；
2. 输入完整域名，例如 `cangwu.dpdns.org`（注意是三级，别漏了前面的名字）；
3. 套餐选 **Free**；
4. Cloudflare 会扫一遍现有解析，扫不到东西没关系，直接继续；
5. 最后它给你**两条 NS 地址**，形如：

```text
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```

这两条一定要完整复制，一条都不能少。

## 三、回 DigitalPlat 改 NS

打开 DigitalPlat 的域名列表，找到你的域名 → 管理 → **Nameservers**，把刚才那两条粘进去，保存。

然后就是等。通常几分钟到几小时，Cloudflare 后台会从 *Pending* 变成 *Active*。

想自己确认有没有生效：

```bash
dig NS cangwu.dpdns.org
```

返回里应该有 `cloudflare.com` 结尾的两条。

## 四、本地把站生成出来

```bash
node build.mjs
```

产物在 `public/`：一堆 HTML、一个 `feed.xml`、一个 `sitemap.xml`，没有任何需要服务端的东西。

先本地看一眼：

```bash
node serve.mjs
# 打开 http://localhost:4321
```

## 五、推到 GitHub

```bash
git init
git add .
git commit -m "init blog"
git branch -M main
git remote add origin git@github.com:你的用户名/blog.git
git push -u origin main
```

仓库里**不用**提交 `public/`，它每次构建都会重新生成。

## 六、Cloudflare Pages 建项目

1. 打开 **Workers & Pages → Create → Pages → Connect to Git**；
2. 选刚才那个仓库；
3. 构建设置这样填：

| 项目 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `node build.mjs` |
| Build output directory | `public` |
| Node version | 环境变量加 `NODE_VERSION = 22` |

4. 点 **Save and Deploy**，第一次构建大约一分钟。

构建成功后，你会先拿到一个 `xxx.pages.dev` 的地址。先确认它能打开，再绑域名。

## 七、绑定自定义域名

Pages 项目 → **Custom domains** → **Set up a custom domain** → 输入 `cangwu.dpdns.org`。

因为域名已经在 Cloudflare 里了，这一步它会**自动加一条 CNAME 并签证书**，不用你手动去 DNS 页面操作。等状态变成 *Active* 就成了。

顺便把 `www` 也加上，然后在 **Rules → Redirect Rules** 里把 `www` 301 到主域名，避免两份内容。

## 八、最后检查三件事

- **SSL/TLS 模式**：设为 `Full (strict)`。Pages 自带证书，这样既加密又不会死循环；
- **Always Use HTTPS**：打开；
- **缓存**：HTML 建议 `max-age=0, must-revalidate`，静态资源长缓存。仓库里的 `_headers` 已经写好了。

## 几个坑

1. **免费域名不能备案**。如果访客主要在国内，直连速度一般，介意的话可以再套一层国内 CDN，但那就需要备案了。
2. **记得续期**。免费域名有到期时间，到期前在 DigitalPlat 后台续一下，过期了域名会被回收。
3. **不要频繁改 NS**。每改一次都要等一轮传播，容易把自己搞晕。
4. **`pages.dev` 和自定义域名会同时存在**，搜索引擎可能收录两份。在 `robots.txt` 里只放行主域名，或者直接用 301 处理。

## 一条命令的版本

如果你只想本地跑起来看看效果，上面的二到七步都可以先不管：

```bash
node build.mjs && node serve.mjs
```

打开 `http://localhost:4321`，就是一个完整的博客了。
