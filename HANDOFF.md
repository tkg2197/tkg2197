# 「我们的小窝」项目交接文档

更新时间：2026-05-22  
项目路径：`C:\Users\Jason\cute-blog`

## 1. 项目概述

「我们的小窝」是一个双人情侣向的可爱插画风个人网站。作者由两只小狗代表：

- 白狗：作者 A，主色 `#7aa6d4`
- 棕狗：作者 B，主色 `#d49356`

当前项目仍是无构建步骤的纯前端原型，技术形态为 HTML + CSS + 原生 JavaScript。后续会迁移到正式框架，但目前请继续按原型方式开发。

规划模块：

1. 首页：Welcome 封面 + 个人/小窝介绍页
2. 双人博客
3. 生活记录 + 心情
4. 照片墙
5. 时段活动记录 + 当日统计
6. 两人账号系统

已实现的主要页面：

- `index.html`：首页
- `blog.html`：双人博客列表页
- `blog-post.html`：博客文章详情页
- `records.html`：生活记录页
- `photos.html`：照片墙
- `activity.html`：时段活动记录与统计页

## 2. 技术与开发约定

### 2.1 当前技术形态

- 无构建步骤
- 直接运行静态服务器预览
- JavaScript 以 ES5 风格、IIFE、`"use strict"` 为主
- 注释和沟通使用中文

预览命令：

```bash
cd C:\Users\Jason\cute-blog
python -m http.server 4321
```

浏览器打开：

```text
http://localhost:4321
```

用户有时也会直接通过 `file:///C:/Users/Jason/cute-blog/index.html` 打开页面，所以页面跳转逻辑要尽量兼容 `file://`。

### 2.2 防缓存版本号

所有 CSS / JS 在 HTML 中都带 `?v=N`：

```html
<link rel="stylesheet" href="styles.css?v=24" />
<script src="cover.js?v=6"></script>
```

每次改动某个 CSS / JS 文件，都必须把所有引用它的 HTML 中对应版本号加 1。以 HTML 中当前实际值为准。

### 2.3 数据层隔离

所有本地数据读写必须封装在专门对象里，方便未来整体替换为 Supabase。

当前数据层：

- 日记文字：`diary.js` 里的 `Store`
  - `localStorage` key:
    - `cuteblog.diary.white`
    - `cuteblog.diary.brown`
- 照片：`photo-store.js` 里的 `window.CBPhoto`
  - IndexedDB：`cuteblog-photos`
  - API：`all` / `add` / `remove` / `processFile` / `upload`
- 时段活动：`activity.js` 里的 `ActivityStore`
  - `localStorage` key：`cuteblog.activities.v1`

新增功能如果涉及数据，必须继续新建独立存储对象，不要把读写逻辑散落在 UI 代码里。

### 2.4 视觉风格

整体方向：

- 可爱但不要幼稚
- 柔和、轻盈、插画感
- 高级感来自留白、玻璃白卡片、轻阴影、克制动效
- 不要照搬用户参考图里的死板/技术博客风格

常用视觉基调：

```css
linear-gradient(172deg,#d3e8f4,#e7f0d6,#eef4e1)
```

作者色：

```css
白狗: #7aa6d4
棕狗: #d49356
```

弹簧缓动：

```css
cubic-bezier(0.34,1.56,0.64,1)
```

## 3. 当前文件结构重点

```text
cute-blog/
  index.html
  styles.css
  cover.js
  home.js

  blog.html
  blog-index.css
  blog-index.js

  blog-post.html
  blog.css
  blog.js

  records.html
  records.css
  records.js

  photos.html
  photos.css
  photos.js

  activity.html
  activity.css
  activity.js

  corner-dogs.css
  corner-dogs.js

  scroll-reveal.css
  scroll-reveal.js

  page-transition.css
  page-transition.js

  diary.css
  diary.js
  scene.js
  photo-store.js

  assets/
  gif/
  tools/
  verification/
  activitywatch-master/
```

## 4. 首页当前状态

### 4.1 `index.html`

首页现在是两层结构：

1. Welcome 封面
2. 小窝主页内容页

当前引用：

```html
<link rel="stylesheet" href="styles.css?v=24" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="cover.js?v=6"></script>
<script src="home.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

首页已经不再引用旧的：

- `scene.js`
- `diary.js`
- `photo-store.js`

旧首页场景系统仍保留在文件中，未来如果要恢复可继续使用，但当前首页不是旧的可点击小狗场景。

### 4.2 Welcome 封面

使用素材：

```text
assets/首页封面.png
```

效果：

- 背景图全屏显示
- canvas 生成悬浮花瓣
- 鼠标位置会排斥花瓣
- 标题：`Welcome to our home`
- 底部按钮：`Explore`
- 鼠标 hover 按钮：
  - `Explore` 向上滑出
  - `Start now` 从下方滑入
- 点击 `Explore`：
  - Welcome 标题向上收缩并消失
  - 新首页从上往下逐渐显示

核心逻辑在：

```text
cover.js
styles.css
```

### 4.3 跳过 Welcome 封面

需求：

- 直接打开 `index.html`：显示 Welcome 封面
- 从其它页面点击“返回首页”：不显示 Welcome 封面，直接进入小窝主页内容页

当前实现：

- `page-transition.js` 在跳转到 `index.html` 时追加 `?skipCover=1`
- `cover.js` 读取 `skipCover=1` 后直接显示主页内容
- `cover.js` 会用 `history.replaceState` 清理 URL
- 同时使用 `sessionStorage` 作为兜底

相关函数：

```text
cover.js -> shouldSkipCover()
cover.js -> revealHomeNow()
page-transition.js -> normalizeTargetHref()
```

注意：这块曾经出过问题，改页面跳转时要重新验证 `http://localhost` 和 `file://` 两种打开方式。

### 4.4 小窝主页内容页

小窝主页内容模仿用户参考图的布局，但风格保持本站柔和可爱：

- 顶部导航
  - 双人博客
  - 生活记录
  - 照片墙
  - 时段活动
- 中心头像/小狗标识
- 标题：`我们的小窝`
- 副标题和作者徽章
- About 区块
- Modules 区块
- Posts 区块

背景：

- 使用各时段草地图片作为模糊背景
- 不显示旧首页那两只场景小狗

时段背景映射在 `home.js`：

```js
var BACKGROUNDS = {
  morning: "assets/早晨草地.png",
  forenoon: "assets/上午草地.png",
  noon: "assets/中午草地.png",
  afternoon: "assets/下午草地.jpg",
  dusk: "assets/傍晚草地.png",
  evening: "assets/晚上草地.png",
  midnight: "assets/半夜草地.png"
};
```

## 5. 双人博客模块

### 5.1 `blog.html`

博客列表页，当前引用：

```html
<link rel="stylesheet" href="blog-index.css?v=1" />
<link rel="stylesheet" href="corner-dogs.css?v=3" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="blog-index.js?v=1"></script>
<script src="corner-dogs.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

功能：

- 静态文章列表
- 作者筛选
- 标签筛选
- 右侧标签区域
- 点击文章进入 `blog-post.html`
- 页面右下/左下有互动小狗
- 页面跳转有全站转场
- 滚动时内容块有进入动画

### 5.2 `blog-post.html`

文章详情页，当前引用：

```html
<link rel="stylesheet" href="blog.css?v=1" />
<link rel="stylesheet" href="corner-dogs.css?v=3" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="blog.js?v=1"></script>
<script src="corner-dogs.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

已实现效果：

- 顶部文章标签在轻微下滑时汇聚
- 再往下滑一段距离后顶部标签消失
- 右侧目录 TOC 高亮当前阅读章节
- TOC 旁边进度条随阅读进度下滑
- 风格和其它页面保持一致，没有照搬参考图

核心逻辑：

```text
blog.js
blog.css
```

## 6. 生活记录与照片墙

### 6.1 `records.html`

生活记录页，当前引用：

```html
<link rel="stylesheet" href="records.css?v=2" />
<link rel="stylesheet" href="corner-dogs.css?v=3" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="photo-store.js?v=1"></script>
<script src="records.js?v=2"></script>
<script src="corner-dogs.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

说明：

- 读取日记和照片数据
- 以便签时间线形式展示
- 便签上显示当天照片
- 点击照片可查看大图
- 无本地数据时页面高度可能只有一屏，这是正常情况

### 6.2 `photos.html`

照片墙页，当前引用：

```html
<link rel="stylesheet" href="photos.css?v=3" />
<link rel="stylesheet" href="corner-dogs.css?v=3" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="photo-store.js?v=1"></script>
<script src="photos.js?v=2"></script>
<script src="corner-dogs.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

说明：

- 读取 IndexedDB 中的照片
- 按日期分组展示为照片摞
- 点击进入当天网格
- 支持全屏灯箱
- 灯箱底部显示当天该作者的日记文字
- 与生活记录中的上传照片互通

## 7. 时段活动记录与统计

### 7.1 `activity.html`

当前引用：

```html
<link rel="stylesheet" href="activity.css?v=1" />
<link rel="stylesheet" href="corner-dogs.css?v=3" />
<link rel="stylesheet" href="scroll-reveal.css?v=1" />
<link rel="stylesheet" href="page-transition.css?v=2" />

<script src="activity.js?v=1"></script>
<script src="corner-dogs.js?v=3"></script>
<script src="scroll-reveal.js?v=1"></script>
<script src="page-transition.js?v=3"></script>
```

功能：

- 记录每天 7 个时段分别做了什么
- 支持作者选择
- 支持分类选择
- 支持心情记录
- 支持任意整数分钟输入
- 生成当天时间线
- 生成当天分类占比统计图
- 可以删除记录

重要修复：

- 分钟输入曾经只能输入 `21` / `26` / `31` 等间隔数字
- 当前已修复为可以输入任意整数分钟
- 检查 `activity.html` 中分钟输入应为 `step="1"`

数据：

```text
localStorage key: cuteblog.activities.v1
```

存储对象：

```text
activity.js -> ActivityStore
```

## 8. 角落互动小狗

共享文件：

```text
corner-dogs.css
corner-dogs.js
```

当前用于：

- `records.html`
- `photos.html`
- `blog.html`
- `blog-post.html`
- `activity.html`

首页当前没有角落小狗。

素材：

```text
gif/小白-趴着.png
gif/小白-翻身问号.gif
gif/棕狗-待机.png
gif/棕狗-健身.gif
```

行为：

- 左下角：白狗
- 右下角：棕狗
- 白狗平时使用静态趴着图
- 点击白狗播放 `小白-翻身问号.gif`
- 棕狗平时使用静态待机图
- 点击棕狗播放 `棕狗-健身.gif`
- 播放完成后回到静态图

关于“看鼠标”：

- 用户明确不希望整个身体随鼠标倾斜
- 当前做法是在小狗上叠加一个小眼神点，眼神点跟随鼠标方向移动
- 如果未来要实现真正“眼睛看向鼠标”，最好让用户生成多张眼睛/头部方向素材

白狗 GIF 播放时长：

- `小白-翻身问号.gif` 实际约 3060ms
- 当前代码按约 3300ms 后恢复静态，避免没播完就回到静止

## 9. 全站滚动进入动画

共享文件：

```text
scroll-reveal.css
scroll-reveal.js
```

效果：

- 内容块进入视口时：
  - 初始 `opacity: 0`
  - 初始向下偏移约 34px
  - 进入视口后向上移动到最终位置并淡入
  - 过渡时长约 0.68s
  - 缓动函数 `ease-out`
- 离开视口后会移除显示状态
- 再次进入视口会重新触发动画

这是用户明确要求的：

- 每个页面都有
- 每次下滑都能重新触发
- 不是只首次触发

实现细节：

- 使用 `IntersectionObserver`
- 使用 `MutationObserver` 处理照片墙等动态生成内容
- 排除弹层、灯箱、隐藏节点和角落小狗

重要注意：

- fullPage 截图中视口外内容可能是透明或半透明，这是滚动揭示效果导致的，不代表内容丢失。
- 验证时要用浏览器实际滚动并读取元素样式，而不是只看整页截图。

## 10. 全站页面跳转动画

共享文件：

```text
page-transition.css
page-transition.js
```

效果：

1. 点击站内链接
2. 当前页面主体向上收缩、淡出、模糊
3. 延迟跳转
4. 新页面主体从上往下逐渐显示

用户要求：

- 每一次页面跳转都和首页 Explore 的跳转一样丝滑
- 首页点击博客、生活记录、照片墙、时段活动时也必须有当前页消失动画

当前转场片段选择器：

```js
var PIECE_SELECTOR = [
  ".home-nav",
  ".home-profile",
  ".rec-back",
  ".rec-main",
  ".pw-back",
  ".pw-main",
  ".bi-top",
  ".bi-shell",
  ".blog-top",
  ".blog-tags",
  ".blog-shell",
  ".act-top",
  ".act-shell"
].join(",");
```

曾经的问题：

- 首页内容页本身有 `homeDropIn` 动画
- 点击导航离场时，`homeDropIn` 的 animation fill mode 覆盖了全站离场 transform/opacity

当前修复：

```css
.pt-ready.pt-leaving .pt-page-piece {
  animation: none !important;
}
```

如果后续修改首页动画或页面转场，请重点回归这个问题。

## 11. 旧首页时段场景系统

旧系统文件仍然存在：

```text
scene.js
diary.js
diary.css
styles.css 中大量旧 scene/dog 样式
```

旧系统说明：

- 主页原本会随真实时间切换 7 个时段
- 每个时段有背景
- 两只小狗在场景中可点击
- 点击小狗弹出日记浮层

当前首页已经换成新 Welcome + 小窝主页结构，不再启用旧场景。

旧素材状态：

- 已有时段背景：
  - `assets/早晨草地.png`
  - `assets/上午草地.png`
  - `assets/中午草地.png`
  - `assets/下午草地.jpg`
  - `assets/傍晚草地.png`
  - `assets/晚上草地.png`
  - `assets/半夜草地.png`
- 小狗切图：
  - 早晨/上午/中午/下午/傍晚/晚上已有白狗/棕狗
  - 半夜小狗切图仍缺

如果未来要恢复旧首页场景，需要重新把 `scene.js` / `diary.js` / `photo-store.js` 引回 `index.html`，并恢复对应 DOM 结构。不要直接删除这些旧文件，它们仍有参考价值。

## 12. ActivityWatch 项目阅读结论

用户在项目下放了：

```text
activitywatch-master/
```

用户原本想借鉴 ActivityWatch 的时间线和统计图。

结论：

- 不建议直接接入 ActivityWatch 原项目作为本站功能
- ActivityWatch 是完整的本地时间追踪系统，复杂度远超本站需求
- 本站只需要用户手动上传“每个时段做了什么”和分钟数
- 当前 `activity.html` 已经按轻量方式实现：
  - 手动记录
  - 当日时间线
  - 当日分类占比统计

可以继续参考 ActivityWatch 的信息组织方式，但不要照搬它的视觉风格，也不要把它的大型架构引入当前纯前端原型。

## 13. 视觉检查标准

用户特别强调：改完必须真实浏览器验证，不允许只看代码。

检查原则：

- 截图只能判断整体观感
- 颜色、字号、间距、位置、溢出、报错必须用代码在真实浏览器中读取具体数值
- 桌面和移动都要检查

项目已有检查脚本：

```text
tools/inspect.mjs
```

运行方式：

```bash
node tools/inspect.mjs index.html test.png
```

脚本会检查：

- desktop：1440 x 900
- mobile：390 x 844
- console error
- pageerror
- request failed
- HTTP 4xx
- 横向溢出
- 页面关键元素尺寸/位置/样式
- 首页封面、Explore hover、Explore click
- 博客文章 TOC
- 活动页测试数据
- 角落小狗
- scroll reveal

如 Playwright 缺失：

```bash
npm init -y
npm i -D playwright
npx playwright install chromium
```

当前项目中已有：

```text
package.json
package-lock.json
node_modules/
```

## 14. 最近验证过的关键行为

### 14.1 返回首页跳过封面

已验证：

- 从其它页面返回首页时，进入的是小窝主页内容页
- 不是 Welcome 封面
- `http://localhost` 和 `file://` 都做过验证

典型验证结果：

```json
{
  "bodyClass": "home-profile-page home-revealed",
  "coverHidden": true,
  "title": "我们的小窝",
  "overflow": false
}
```

### 14.2 直接打开首页显示 Welcome

已验证：

```json
{
  "bodyClass": "home-profile-page home-cover-open",
  "coverHidden": false,
  "coverOpacity": "1"
}
```

### 14.3 首页点击博客有离场动画

点击首页导航进入博客时，中途检查过：

```json
{
  "profile": {
    "opacity": "0",
    "transform": "matrix(0.94, 0, 0, 0.94, 0, -58)",
    "filter": "blur(10px)",
    "animationName": "none"
  },
  "nav": {
    "opacity": "0",
    "transform": "matrix(0.94, 0, 0, 0.94, 0, -58)",
    "filter": "blur(10px)",
    "animationName": "none"
  }
}
```

### 14.4 全站跳转

验证过 `blog.html -> photos.html`：

- 离场时主体上移、缩放、淡出、模糊
- 新页面进入后恢复正常

### 14.5 滚动揭示

六个页面都做过基本检查：

- 无 console error
- 无 request failed
- 无横向溢出
- 滚动后内容块会重新进入动画

## 15. 后续开发建议

### 15.1 短期优先级

推荐顺序：

1. 继续完善双人博客的数据结构和文章编辑方式
2. 补充更多真实内容，让列表/详情页更接近实际使用
3. 完善活动页分类、时间线交互和统计图细节
4. 统一移动端细节
5. 再考虑 Supabase / 账号系统 / 框架迁移

### 15.2 迁移到正式框架前要确认

用户之前明确说过：里程碑 2 开始前，需要先确认框架：

- Astro SSR
- 或 Next.js

不要擅自决定。

Supabase 项目必须由用户本人创建，AI 不要代为注册账号。

### 15.3 开发时常见坑

- 改 CSS / JS 后忘记更新 HTML 版本号
- 只在 `localhost` 验证，没有检查 `file://` 返回首页逻辑
- 只看截图，没有用 Playwright 读取真实数值
- 修改 `styles.css` 时误伤旧首页场景样式
- 修改页面转场时重新引入首页离场动画失效问题
- 动态生成内容没有被 scroll reveal 识别
- 生活记录/照片墙没本地数据时误以为页面缺内容

## 16. 给下一个接手 AI 的工作方式建议

1. 先读 `index.html`、`styles.css`、`cover.js`、`page-transition.js`、`scroll-reveal.js`
2. 如果做某个页面，再读对应 HTML/CSS/JS
3. 每次改 CSS/JS 后同步更新 HTML 里的 `?v=N`
4. 改完启动本地服务器并运行 `tools/inspect.mjs`
5. 报告时列出关键数值，不要只说“看起来没问题”
6. 所有沟通用中文

这个项目目前的核心方向已经确定：柔和、可爱、带一点高级感的双人生活博客。新的功能实现应该顺着这个气质继续往前走，不要突然变成普通技术博客或后台管理系统。
