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
      { name: 'GitHub', url: 'https://github.com/cangwu', icon: 'github' },
      { name: 'RSS', url: '/feed.xml', icon: 'rss' },
      { name: '关于', url: '/about/', icon: 'link' },
    ],
  },

  // 顶部导航
  nav: [
    { name: '首页', url: '/' },
    { name: '归档', url: '/archives/' },
    { name: '标签', url: '/tags/' },
    { name: '关于', url: '/about/' },
  ],

  // 每页文章数
  postsPerPage: 8,

  // 页脚
  footer: {
    since: 2026,
    // 想显示备案号就填在这里，比如 '沪ICP备00000000号'
    icp: '',
    icpUrl: 'https://beian.miit.gov.cn/',
    extra: '由 Markdown 与一点点耐心驱动',
  },

  // 评论（giscus，基于 GitHub Discussions，免费）
  // 用法：仓库先开启 Discussions，去 https://giscus.app 生成下面四个值
  comments: {
    enabled: false,
    repo: '',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
    mapping: 'pathname',
    theme: 'preferred_color_scheme',
  },

  // 统计（可选，留空则不注入脚本）
  analytics: {
    // Cloudflare Web Analytics 的 token，例如 'a1b2c3...'
    cloudflareToken: '',
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
