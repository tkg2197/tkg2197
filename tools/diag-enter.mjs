// 验证全站页面进入/离场动画
// 1) 直接打开各页 → 检查进入动画
// 2) 从 A 页点导航到 B 页 → 检查 A 的离场 + B 的进入
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));

function snap(label, selector) {
  return page.evaluate(({ label, selector }) => {
    const el = document.querySelector(selector);
    if (!el) return { label, missing: true };
    const cs = getComputedStyle(el);
    return {
      label,
      t: Math.round(performance.now()),
      html: document.documentElement.className,
      opacity: cs.opacity,
      transform: cs.transform.slice(0, 36),
      filter: cs.filter
    };
  }, { label, selector });
}

async function probeEnter(url, selector, name) {
  await page.goto("http://localhost:4321/" + url, { waitUntil: "domcontentloaded" });
  const samples = [];
  for (let i = 0; i < 5; i++) {
    samples.push(await snap(i === 0 ? "@0" : `@${i * 180}`, selector));
    await page.waitForTimeout(180);
  }
  console.log(`\n${name} (${url})`);
  samples.forEach(s => console.log("  ", JSON.stringify(s)));
  const first = samples[0], last = samples[samples.length - 1];
  const ok = first && first.opacity && +first.opacity < 0.2 &&
             last && +last.opacity > 0.9;
  console.log("  动画运行:", ok ? "✓" : "✗");
}

const targets = [
  { url: "places.html",   sel: ".places-main", name: "今年想去" },
  { url: "blog.html",     sel: ".bi-shell",    name: "双人博客列表" },
  { url: "blog-post.html",sel: ".blog-shell",  name: "博客文章" },
  { url: "records.html",  sel: ".rec-main",    name: "生活记录" },
  { url: "photos.html",   sel: ".pw-main",     name: "照片墙" },
  { url: "activity.html", sel: ".act-shell",   name: "时段活动" }
];

for (const t of targets) await probeEnter(t.url, t.sel, t.name);

// 离场动画：从 photos.html 点「时段活动」
console.log("\n离场动画 photos → activity");
await page.goto("http://localhost:4321/photos.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
await page.click('a[href="activity.html"]');
await page.waitForTimeout(220);
const leaving = await page.evaluate(() => {
  const el = document.querySelector(".pw-main");
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  return {
    htmlClass: document.documentElement.className,
    opacity: cs.opacity,
    transform: cs.transform.slice(0, 36),
    filter: cs.filter
  };
});
console.log("  离场中 (220ms):", JSON.stringify(leaving));

// 等跳到新页
await page.waitForTimeout(900);
const arrived = await page.evaluate(() => ({
  path: location.pathname.split("/").pop(),
  html: document.documentElement.className,
  shellOpacity: getComputedStyle(document.querySelector(".act-shell")).opacity
}));
console.log("  到达新页:", JSON.stringify(arrived));

console.log("\n报错:", errors.length ? errors : "无");
await browser.close();
