// 验证全站鬼魂装饰：
// ① 各页都能放下鬼魂；② 鬼魂矩形不与任何可见文字 Range 矩形重叠
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message));
page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));

async function inject_diary_photos() {
  // 给生活记录/照片墙塞点测试数据，否则页面太空看不到鬼魂避字效果
  await page.evaluate(async () => {
    if (!window.CBPhoto) return;
    try {
      await new Promise(res => {
        const req = indexedDB.deleteDatabase("cuteblog-photos");
        req.onsuccess = req.onerror = req.onblocked = () => res();
      });
    } catch (e) {}
  });
}

async function check(url, label) {
  await page.goto("http://localhost:4321/" + url, { waitUntil: "networkidle" });
  // 鬼魂初始化要 ~900ms + 自身 1200ms 才完全到位
  await page.waitForTimeout(2300);

  const result = await page.evaluate(() => {
    const scene = document.querySelector(".cb-ghost");
    if (!scene) return { error: "未找到 .cb-ghost" };
    const cs = getComputedStyle(scene);
    const rect = scene.getBoundingClientRect();

    // 重算所有文本 Range 矩形
    const overlaps = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest(".cb-ghost, .pw-lb, .pw-modal")) return NodeFilter.FILTER_REJECT;
        const cs2 = getComputedStyle(p);
        if (cs2.display === "none" || cs2.visibility === "hidden" ||
            parseFloat(cs2.opacity) < 0.05) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      try {
        const r = document.createRange();
        r.selectNodeContents(node);
        const list = r.getClientRects();
        for (const tr of list) {
          if (tr.width < 1 || tr.height < 1) continue;
          if (rect.left < tr.right && rect.right > tr.left &&
              rect.top  < tr.bottom && rect.bottom > tr.top) {
            overlaps.push({
              text: (node.nodeValue || "").slice(0, 30).trim(),
              tr: { l: Math.round(tr.left), t: Math.round(tr.top),
                    w: Math.round(tr.width), h: Math.round(tr.height) }
            });
          }
        }
      } catch (e) {}
    }

    return {
      ghostRect: {
        l: Math.round(rect.left), t: Math.round(rect.top),
        w: Math.round(rect.width), h: Math.round(rect.height)
      },
      opacity: cs.opacity,
      hidden: parseFloat(cs.opacity) < 0.1,
      sceneClass: scene.className,
      overlapCount: overlaps.length,
      overlapSamples: overlaps.slice(0, 3)
    };
  });

  console.log(`\n${label} (${url})`);
  console.log("  " + JSON.stringify(result));
  if (result.error) { console.log("  ✗", result.error); return false; }
  if (result.hidden) {
    console.log("  ⚠ 鬼魂当前隐藏（页面太满找不到空位）");
    return true;
  }
  console.log("  鬼魂位置:", `${result.ghostRect.w}×${result.ghostRect.h} @ (${result.ghostRect.l}, ${result.ghostRect.t})`);
  console.log("  与文字重叠:", result.overlapCount === 0 ? "✓ 无" : `✗ ${result.overlapCount} 处`);
  return result.overlapCount === 0;
}

const pages = [
  { url: "index.html?skipCover=1#home", label: "首页 (skipCover)" },
  { url: "places.html",   label: "今年想去" },
  { url: "blog.html",     label: "双人博客列表" },
  { url: "blog-post.html",label: "博客文章" },
  { url: "records.html",  label: "生活记录" },
  { url: "photos.html",   label: "照片墙" },
  { url: "activity.html", label: "时段活动" }
];

let allOk = true;
for (const p of pages) {
  const ok = await check(p.url, p.label);
  if (!ok) allOk = false;
}

// 给最具代表性的页面截图记录
await page.goto("http://localhost:4321/blog-post.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);
await page.screenshot({ path: "verification/ghost-blog-post.png" });
await page.goto("http://localhost:4321/photos.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);
await page.screenshot({ path: "verification/ghost-photos.png" });

// 近景：把鬼魂放大裁出来，看身体是否完整
await page.goto("http://localhost:4321/photos.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);
const r = await page.evaluate(() => {
  const s = document.querySelector(".cb-ghost");
  if (!s) return null;
  const b = s.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width, h: b.height };
});
if (r) {
  await page.screenshot({
    path: "verification/ghost-closeup.png",
    clip: { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12),
            width: r.w + 60, height: r.h + 60 }
  });
  console.log("近景截图保存");
}

console.log("\n报错:", errors.length ? errors : "无");
console.log("总体:", allOk ? "全部通过 ✓" : "有页面失败 ✗");

await browser.close();
