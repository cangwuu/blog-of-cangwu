// ============================================================
//  站点配置 —— 只需要改这个文件
// ============================================================

export default {
  // 站点基本信息
  title: 'cangwu的小博客',
  subtitle: '在代码、阅读与生活之间',
  description: 'cangwu 的个人博客：技术笔记、读书笔记，和一些不想发在朋友圈的长句子。',
  keywords: ['cangwu', '博客', '笔记', '随笔', 'Cloudflare Pages'],

  // 你的域名（结尾不要带斜杠）
  url: 'https://cangwu.dpdns.org',

  // 作者
  author: {
    name: 'cangwu',
    avatar: '/assets/avatar.jpg',
    bio: '写代码，也写字。这里放一些值得留下来的东西。',
    // 社交链接，不需要的整行删掉即可
    links: [
      { name: 'GitHub', url: 'https://github.com/cangwuu', icon: 'github' },
      { name: 'RSS', url: '/feed.xml', icon: 'rss' },
      { name: '关于', url: '/about/', icon: 'link' },
    ],
  },

  // 顶部导航
  nav: [
    { name: '首页', url: '/' },
    { name: '归档', url: '/archives/' },
    { name: '标签', url: '/tags/' },
    { name: '小玩具', url: '/toys/' },
    { name: '关于', url: '/about/' },
  ],

  // 每页文章数
  postsPerPage: 8,

  // 页脚
  footer: {
    since: 2026,
    // 站点底部的备案链接。萌国 ICP 备案填这里：
    // 文案 = 萌ICP备20264210号，地址 = https://icp.gov.moe/?keyword=20264210
    // 真实工信部备案同理，把下面两行换成自己的
    icp: '萌ICP备20264210号',
    icpUrl: 'https://icp.gov.moe/?keyword=20264210',
    extra: '由 Markdown 与一点点耐心驱动',
  },

  // 评论（giscus，基于 GitHub Discussions，免费）
  // 开启步骤：
  //   1. 仓库 Settings → General → Features，勾上 Discussions
  //   2. 打开 https://giscus.app/zh-CN ，仓库填 cangwuu/blog-of-cangwu
  //      （第一次会让你安装 giscus App，点一下授权）
  //   3. 页面往下会生成一段代码，把里面的 data-repo-id 和 data-category-id
  //      两个值抄到下面，然后把 enabled 改成 true
  comments: {
    enabled: true,
    repo: 'cangwuu/blog-of-cangwu',
    repoId: 'R_kgDOVbPSJA',
    category: 'Announcements',
    categoryId: 'DIC_kwDOVbPSJM4DJ4Y0',
    mapping: 'pathname',
    theme: 'preferred_color_scheme',
  },

  // 统计（Cloudflare Web Analytics，免费且不追踪个人）
  // 开启步骤：Cloudflare 控制台 → 分析 → Web Analytics → 添加站点
  //           → 复制 "JS 代码片段" 里的 token 填到下面
  analytics: {
    cloudflareToken: '369d2d792ae746268360a7e873e59ec8',
  },

  // 首页首屏文案
  hero: {
    enabled: true,
    // 一句话问候
    greeting: '你好，我是',
    // 可以写多行
    lines: [
      '在这里写下学到的东西、想清楚的问题，',
      '以及那些不写下来就会忘掉的日子。',
    ],
  },
};
