// 验证鬼魂说话气泡
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));

await page.goto("http://localhost:4321/photos.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);

// 拿 ghost.js 里的台词数组（直接读源文件提取）
const phrasesText = await page.evaluate(async () => {
  const txt = await fetch("/ghost.js?v=2").then(r => r.text());
  const m = txt.match(/BUBBLE_PHRASES\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return [];
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map(x => x[1]);
});
console.log(`台词库共 ${phrasesText.length} 句:`);
phrasesText.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}. ${p}`));

async function snapshot(label) {
  const v = await page.evaluate(() => {
    const b = document.querySelector(".cb-ghost__bubble");
    const g = document.querySelector(".cb-ghost");
    return {
      bubbleExists: !!b,
      bubbleText: b ? b.textContent : "",
      bubbleVisible: b ? b.classList.contains("is-visible") : false,
      bubbleOpacity: b ? +getComputedStyle(b).opacity : 0,
      bubbleLeft: b ? Math.round(parseFloat(b.style.left || "0")) : null,
      bubbleTop: b ? Math.round(parseFloat(b.style.top || "0")) : null,
      ghostRunningAway: g ? g.classList.contains("run-away") : false,
      ghostExists: !!g
    };
  });
  console.log(label.padEnd(28), JSON.stringify(v));
  return v;
}

// 鬼魂当前的中心坐标
async function ghostCenter() {
  return await page.evaluate(() => {
    const g = document.querySelector(".cb-ghost");
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

// 触发悬停，记录气泡台词
async function hoverAndRead() {
  // 等鬼魂落定（不在 run-away 状态）
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => {
      const g = document.querySelector(".cb-ghost");
      return g && !g.classList.contains("run-away") &&
             +getComputedStyle(g).opacity > 0.9;
    });
    if (s) break;
    await page.waitForTimeout(150);
  }
  const c = await ghostCenter();
  if (!c) return null;
  await page.mouse.move(c.x - 80, c.y - 80);  // 先移到一侧，避免直接 dispatch
  await page.waitForTimeout(80);
  await page.mouse.move(c.x, c.y);            // 平滑滑入触发 mouseenter
  await page.waitForTimeout(280);
  const snap = await snapshot("悬停后 (≈280ms):");
  // 等到 BUBBLE_HOLD(1200ms) 触发跑掉
  await page.waitForTimeout(1100);
  return snap;
}

const initial = await snapshot("初始 (无气泡):");

const phrasesSeen = new Set();
console.log("\n=== 连续 6 次悬停 ===");
for (let i = 0; i < 6; i++) {
  const s = await hoverAndRead();
  if (s && s.bubbleText) phrasesSeen.add(s.bubbleText);
  // 等鬼魂跑掉、再降落到新位置 (runaway: ~450 + 500-1300 + 1200 = ~2-3s)
  await page.waitForTimeout(2400);
}

console.log("\n出现过的台词：");
Array.from(phrasesSeen).forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
console.log("\n检查项:");
console.log("  初始气泡隐藏 (opacity<0.1):    " + (initial.bubbleOpacity < 0.1 ? "✓" : "✗"));
console.log("  气泡 DOM 存在:                  " + (initial.bubbleExists ? "✓" : "✗"));
const allInLib = Array.from(phrasesSeen).every(p => phrasesText.includes(p));
console.log("  说出的台词全部来自台词库:        " + (allInLib ? "✓" : "✗"));
console.log("  台词种类 ≥3 (无连续重复抽到):    " + (phrasesSeen.size >= 3 ? `✓ (${phrasesSeen.size} 种)` : `✗ (${phrasesSeen.size} 种)`));
console.log("  台词库句子数 ≥15:               " + (phrasesText.length >= 15 ? `✓ (${phrasesText.length} 句)` : `✗ (${phrasesText.length})`));

// 截一张气泡可见时的图
console.log("\n=== 截图 ===");
// 重新走一次，截下气泡显示瞬间
for (let i = 0; i < 25; i++) {
  const ok = await page.evaluate(() =>
    document.querySelector(".cb-ghost") &&
    !document.querySelector(".cb-ghost").classList.contains("run-away") &&
    +getComputedStyle(document.querySelector(".cb-ghost")).opacity > 0.9
  );
  if (ok) break;
  await page.waitForTimeout(150);
}
const c2 = await ghostCenter();
if (c2) {
  await page.mouse.move(c2.x - 80, c2.y - 80);
  await page.waitForTimeout(60);
  await page.mouse.move(c2.x, c2.y);
  await page.waitForTimeout(380);
  await page.screenshot({
    path: "verification/ghost-bubble.png",
    clip: {
      x: Math.max(0, c2.x - 200),
      y: Math.max(0, c2.y - 180),
      width: 400,
      height: 280
    }
  });
  console.log("近景截图: verification/ghost-bubble.png");
}

console.log("\n报错:", errors.length ? errors : "无");
await browser.close();
