// 测从悬停到鬼魂进入 run-away 状态的实际间隔
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:4321/photos.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);

// 拿 ghost.js 里的 BUBBLE_HOLD 常量值，确认源码已更新
const holdInSrc = await page.evaluate(async () => {
  const t = await fetch("/ghost.js?v=3").then(r => r.text());
  const m = t.match(/BUBBLE_HOLD\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
});
console.log("源码 BUBBLE_HOLD =", holdInSrc, "ms", holdInSrc === 700 ? "✓" : "✗");

const measurements = [];
for (let trial = 0; trial < 4; trial++) {
  // 等鬼魂落定
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate(() => {
      const g = document.querySelector(".cb-ghost");
      return g && !g.classList.contains("run-away") &&
             +getComputedStyle(g).opacity > 0.9;
    });
    if (ok) break;
    await page.waitForTimeout(150);
  }

  const c = await page.evaluate(() => {
    const g = document.querySelector(".cb-ghost");
    const r = g.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(c.x - 80, c.y - 80);
  await page.waitForTimeout(60);
  const startTs = Date.now();
  await page.mouse.move(c.x, c.y);            // 触发 mouseenter

  // 轮询：每 20ms 检查 .cb-ghost 是否进入 run-away
  let runAwayMs = null;
  for (let i = 0; i < 80; i++) {
    const now = Date.now() - startTs;
    const ra = await page.evaluate(() =>
      document.querySelector(".cb-ghost").classList.contains("run-away")
    );
    if (ra) { runAwayMs = now; break; }
    await page.waitForTimeout(20);
  }
  console.log(`第 ${trial + 1} 次：mouseenter → run-away 用时 ${runAwayMs}ms`);
  if (runAwayMs != null) measurements.push(runAwayMs);

  // 等鬼魂重新落地
  await page.waitForTimeout(2400);
}

const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
console.log("\n平均间隔:", Math.round(avg), "ms");
console.log("范围: [" + Math.min(...measurements) + ", " + Math.max(...measurements) + "] ms");
console.log("接近 700 ms (允许 ±120):", Math.abs(avg - 700) <= 120 ? "✓" : "✗");

await browser.close();
