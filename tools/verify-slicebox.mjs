// 照片墙灯箱 3D 切片翻转专项验证
// 用法: node tools/verify-slicebox.mjs
// 注入 3 张不同尺寸/颜色的测试图，打开灯箱，连续切换，
// 验证：① 同一次翻转所有切片方向一致 ② 每隔一次为整体翻转(1 条)。
import { chromium } from "playwright";

const BASE = "http://localhost:4321/photos.html";
const browser = await chromium.launch();

// 在页面里生成 3 张不同尺寸/颜色的测试图并写入 IndexedDB
async function injectPhotos() {
  async function makeBlob(w, h, color, label) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, color[0]);
    grad.addColorStop(1, color[1]);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.font = "bold " + Math.round(h * 0.5) + "px sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(label, w / 2, h / 2);
    return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
  }
  const date = "2026-05-20";
  const specs = [
    { w: 1200, h: 800,  who: "white", color: ["#e8607a", "#f0a05a"], label: "1" },
    { w: 900,  h: 1200, who: "brown", color: ["#5ab0e8", "#6ad6c5"], label: "2" },
    { w: 1400, h: 700,  who: "white", color: ["#8b6ad6", "#d66ab0"], label: "3" }
  ];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const full = await makeBlob(s.w, s.h, s.color, s.label);
    const thumb = await makeBlob(Math.round(s.w / 3), Math.round(s.h / 3), s.color, s.label);
    await window.CBPhoto.add({
      date, who: s.who, full, thumb, w: s.w, h: s.h, addedAt: Date.now() + i
    });
  }
  return "ok";
}

// 读取翻转中切片的真实状态
function readSlices() {
  const box = document.querySelector(".pw-slicebox");
  if (!box) return { error: "未找到 .pw-slicebox" };
  const slices = Array.from(box.querySelectorAll(".pw-slice"));
  const transforms = slices.map(s => s.style.transform);
  const faces = box.querySelectorAll(".pw-slice__face");
  const shades = box.querySelectorAll(".pw-slice__shade");
  return {
    perspective: getComputedStyle(box).perspective,
    boxScale: box.style.transform,            // scale(1/f)，舞台反向缩放
    sliceCount: slices.length,
    faceCount: faces.length,
    shadeCount: shades.length,
    faceHasDepth: /translateZ\([^0]/.test(faces[0] ? faces[0].style.transform : ""),
    transforms,
    allSameDir: transforms.every(t => t === transforms[0]),
    dir: transforms[0],
    delays: slices.map(s => s.style.transitionDelay)
  };
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("requestfailed", r => errors.push("[请求失败] " + r.url()));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => new Promise(res => {
  const req = indexedDB.deleteDatabase("cuteblog-photos");
  req.onsuccess = req.onerror = req.onblocked = () => res();
}));
await page.reload({ waitUntil: "networkidle" });
console.log("注入测试图:", await page.evaluate(injectPhotos));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

await page.click(".pw-stack");
await page.waitForTimeout(400);
await page.click(".pw-photo");
await page.waitForTimeout(400);
console.log("\n打开灯箱:", await page.evaluate(() =>
  document.querySelector("#pwLbCap").textContent.trim()));

// 连续 4 次翻转：预期 切片→整体→切片→整体
const plan = [
  { nav: "#pwLbNext", want: "切片", shot: "verification/slicebox-sliced.png", mid: 430 },
  { nav: "#pwLbNext", want: "整体", shot: "verification/slicebox-whole.png", mid: 400 },
  { nav: "#pwLbPrev", want: "切片", shot: null, mid: 430 },
  { nav: "#pwLbPrev", want: "整体", shot: null, mid: 400 }
];

for (let k = 0; k < plan.length; k++) {
  const p = plan[k];
  await page.click(p.nav);
  await page.waitForTimeout(95);
  const s = await page.evaluate(readSlices);
  const isWhole = s.sliceCount === 1;
  const kind = isWhole ? "整体" : "切片";
  const ok = kind === p.want && s.allSameDir;
  console.log(`\n翻转 ${k + 1} (${p.nav.includes("Next") ? "下一张" : "上一张"}) ` +
    `${ok ? "✓" : "✗ 不符"}`);
  console.log("  ", JSON.stringify({
    类型: kind, 预期: p.want, 切片数: s.sliceCount,
    方向全一致: s.allSameDir, 翻转量: s.dir,
    面数: s.faceCount, 阴影层: s.shadeCount, 长方体有厚度: s.faceHasDepth,
    景深: s.perspective, 舞台缩放: s.boxScale, 错峰: s.delays
  }));
  if (p.shot) {
    await page.waitForTimeout(p.mid - 95);
    await page.screenshot({ path: p.shot });
    await page.waitForTimeout(1300 - p.mid);
  } else {
    await page.waitForTimeout(1300);
  }
  const done = await page.evaluate(() => ({
    sliceboxGone: !document.querySelector(".pw-slicebox"),
    cap: document.querySelector("#pwLbCap").textContent.trim(),
    overflow: document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1
  }));
  console.log("   收尾:", JSON.stringify(done));
}

// 动画中途关闭灯箱，验证不残留
await page.click("#pwLbNext");
await page.waitForTimeout(150);
await page.click("#pwLbClose");
await page.waitForTimeout(400);
console.log("\n动画中途关闭:", JSON.stringify(await page.evaluate(() => ({
  lbHidden: document.querySelector("#pwLb").classList.contains("is-hidden"),
  sliceboxGone: !document.querySelector(".pw-slicebox")
}))));

console.log("\n报错:", errors.length ? errors : "无");
await page.close();

// ---- 移动端 (390x844) 快速复验 ----
const mPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mErrors = [];
mPage.on("console", m => m.type() === "error" && mErrors.push("[console] " + m.text()));
mPage.on("pageerror", e => mErrors.push("[pageerror] " + e.message));
await mPage.goto(BASE, { waitUntil: "networkidle" });
await mPage.evaluate(injectPhotos);          // 新上下文 IndexedDB 为空，需重注入
await mPage.reload({ waitUntil: "networkidle" });
await mPage.waitForSelector(".pw-stack", { timeout: 5000 });
await mPage.waitForTimeout(300);
await mPage.click(".pw-stack");
await mPage.waitForTimeout(400);
await mPage.click(".pw-photo");
await mPage.waitForTimeout(400);
await mPage.click("#pwLbNext");              // 切片翻转
await mPage.waitForTimeout(1400);
await mPage.click("#pwLbNext");              // 整体翻转
await mPage.waitForTimeout(420);
await mPage.screenshot({ path: "verification/slicebox-mobile.png" });
await mPage.waitForTimeout(1000);
console.log("\n移动端两次翻转完成:", JSON.stringify(await mPage.evaluate(() => ({
  sliceboxGone: !document.querySelector(".pw-slicebox"),
  cap: document.querySelector("#pwLbCap").textContent.trim(),
  overflow: document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1
}))));
console.log("移动端报错:", mErrors.length ? mErrors : "无");
await mPage.close();

await browser.close();
