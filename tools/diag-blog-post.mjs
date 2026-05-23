// 验证 blog-post.html 的两个改动：
// ① 返回按钮：默认隐藏，site-nav 收起后淡入，点击能回到 blog.html
// ② 标签栏：往下滚不再消失，常驻顶部
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));

await page.goto("http://localhost:4321/blog-post.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

async function snap(label) {
  const v = await page.evaluate(() => {
    const back = document.querySelector(".blog-back-btn");
    const tags = document.querySelector("#blogTags");
    const nav = document.querySelector(".site-nav");
    return {
      scrollY: Math.round(window.scrollY),
      back: back ? {
        opacity: getComputedStyle(back).opacity,
        pointerEvents: getComputedStyle(back).pointerEvents,
        rectX: Math.round(back.getBoundingClientRect().left),
        rectY: Math.round(back.getBoundingClientRect().top),
        href: back.getAttribute("href")
      } : null,
      tags: tags ? {
        opacity: getComputedStyle(tags).opacity,
        cls: tags.className,
        transform: getComputedStyle(tags).transform,
        rectY: Math.round(tags.getBoundingClientRect().top)
      } : null,
      navHidden: nav ? nav.classList.contains("is-nav-hidden") : null
    };
  });
  console.log(label, JSON.stringify(v));
  return v;
}

const s0 = await snap("初始 (y=0):           ");

await page.evaluate(() => window.scrollTo(0, 120));
await page.waitForTimeout(500);
const s1 = await snap("轻滑 (y≈120):         ");

await page.evaluate(() => window.scrollTo(0, 380));
await page.waitForTimeout(600);
const s2 = await snap("再滑 (y≈380, 旧版会藏): ");

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(600);
const s3 = await snap("深滑 (y≈900):         ");

// 解析 transform 矩阵的 Y 平移
function ty(m) {
  const arr = (m || "").match(/-?\d*\.?\d+/g);
  if (!arr) return 0;
  // matrix(a,b,c,d,tx,ty) 取第 6 个；matrix3d 取第 14 个
  return arr.length === 16 ? +arr[13] : +arr[5];
}

const checks = [
  { name: "初始：返回按钮隐藏 (opacity<0.1)",      ok: +s0.back.opacity < 0.1 },
  { name: "初始：标签栏可见 (opacity>0.9)",        ok: +s0.tags.opacity > 0.9 },
  { name: "轻滑：标签栏收成胶囊 (is-gathered)",     ok: /is-gathered/.test(s1.tags.cls) && +s1.tags.opacity > 0.9 },
  { name: "深滑：site-nav 已隐藏",                ok: s2.navHidden === true && s3.navHidden === true },
  { name: "深滑：返回按钮可见 + 可点击",            ok: +s3.back.opacity > 0.9 && s3.back.pointerEvents !== "none" },
  { name: "深滑：返回按钮在左上 (x<60, y<40)",     ok: s3.back.rectX < 60 && s3.back.rectY < 40 },
  { name: "返回按钮指向 blog.html",                ok: /blog\.html$/.test(s3.back.href) },
  { name: "深滑：标签栏 is-hidden 类",             ok: /is-hidden/.test(s3.tags.cls) },
  { name: "深滑：标签栏淡出 (opacity<0.1)",        ok: +s3.tags.opacity < 0.1 },
  { name: "深滑：标签栏向上平移 (translateY≈-70)", ok: ty(s3.tags.transform) < -50 }
];
console.log("\n检查项:");
checks.forEach(c => console.log("  " + (c.ok ? "✓" : "✗") + " " + c.name));

// 点击返回按钮验证导航
await page.click(".blog-back-btn");
await page.waitForTimeout(900);
const path = page.url().split("/").pop();
console.log("\n点击返回后到达:", path, path === "blog.html" ? "✓" : "✗");

console.log("\n报错:", errors.length ? errors : "无");

// 截图记录
await page.goto("http://localhost:4321/blog-post.html", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(700);
await page.screenshot({ path: "verification/blog-post-scrolled.png" });
console.log("截图: verification/blog-post-scrolled.png");

await browser.close();
