// 验证导航栏滑动指示器
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));

await page.goto("http://localhost:4321/photos.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);

// 拿到指示器现状（初始时应当在「照片墙」下方，黄色）
async function snapshot(label) {
  const v = await page.evaluate(() => {
    const ind = document.querySelector(".site-nav__indicator");
    if (!ind) return null;
    const pet = ind.querySelector(".site-nav__pet");
    return {
      left: parseFloat(ind.style.left || "0"),
      width: parseFloat(ind.style.width || "0"),
      bgInline: ind.style.background,
      bgComputed: getComputedStyle(ind).backgroundColor,
      opacity: getComputedStyle(ind).opacity,
      isSnap: ind.classList.contains("is-snap"),
      petText: pet ? pet.textContent : null
    };
  });
  console.log(label.padEnd(28), JSON.stringify(v));
  return v;
}

const initial = await snapshot("初始 (照片墙激活):");

// 每个 tab 的预期颜色
const wantColors = {
  "首页":       "rgb(122, 166, 212)",  // #7aa6d4
  "今年想去":   "rgb(131, 208, 188)",  // #83d0bc
  "双人博客":   "rgb(212, 147, 86)",   // #d49356
  "生活记录":   "rgb(245, 193, 182)",  // #f5c1b6
  "照片墙":     "rgb(255, 209, 134)",  // #ffd186
  "时段活动":   "rgb(180, 163, 218)"   // #b4a3da
};

const records = [];
for (const name of Object.keys(wantColors)) {
  const link = await page.locator(`.site-nav__links a`, { hasText: name }).first();
  // 拿目标 tab 的真实位置
  const target = await link.evaluate(el => ({
    text: el.textContent.trim(),
    offsetLeft: el.offsetLeft,
    offsetWidth: el.offsetWidth
  }));
  await link.hover();
  await page.waitForTimeout(450);     // 等指示器滑过去
  const ind = await snapshot(`hover "${name}":`);
  records.push({ name, target, ind, wantColor: wantColors[name] });
}

// 鼠标移出 .site-nav__links：指示器应该回到 active(=照片墙)
await page.mouse.move(720, 700);
await page.waitForTimeout(450);
const after = await snapshot("离开 nav (回照片墙):");

// 滚动：让 nav 收成胶囊，指示器应当 snap 跟到新位置
await page.evaluate(() => window.scrollTo(0, 320));
await page.waitForTimeout(700);
const scrolled = await snapshot("滚动 320px:");

// 截图
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(450);
await page.locator(".site-nav__links a", { hasText: "双人博客" }).first().hover();
await page.waitForTimeout(450);
await page.screenshot({
  path: "verification/nav-indicator-hover.png",
  clip: { x: 0, y: 0, width: 1440, height: 110 }
});

// 检查项
const checks = [];
records.forEach(r => {
  const offMatch = Math.abs(r.ind.left - r.target.offsetLeft) < 1;
  const widMatch = Math.abs(r.ind.width - r.target.offsetWidth) < 1;
  const colMatch = r.ind.bgComputed === r.wantColor;
  checks.push({
    name: `hover "${r.name}"`,
    pos: offMatch ? "✓" : `✗ left=${r.ind.left} vs target=${r.target.offsetLeft}`,
    wid: widMatch ? "✓" : `✗ width=${r.ind.width} vs target=${r.target.offsetWidth}`,
    col: colMatch ? "✓" : `✗ ${r.ind.bgComputed} vs want=${r.wantColor}`
  });
});

console.log("\n=== 检查 ===");
checks.forEach(c => console.log(`  ${c.name.padEnd(20)} 位置 ${c.pos}   宽度 ${c.wid}   颜色 ${c.col}`));
console.log("\n  离开后回到照片墙: " +
  (after.bgComputed === wantColors["照片墙"] ? "✓" : `✗ ${after.bgComputed}`));
console.log("  滚动后指示器仍可见 + snap: " +
  ((+scrolled.opacity > 0.9 && scrolled.isSnap) ? "✓" : `✗ opacity=${scrolled.opacity} snap=${scrolled.isSnap}`));
console.log("\n报错:", errors.length ? errors : "无");
await browser.close();
