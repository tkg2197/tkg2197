// 页面视觉/布局检查 —— 用法: node tools/inspect.mjs <页面> [截图名]
// 例: node tools/inspect.mjs blog.html blog.png
import { chromium } from "playwright";

const path = process.argv[2] || "index.html";
const shotName = process.argv[3] || "shot.png";
const BASE = "http://localhost:4321/";
const browser = await chromium.launch();

function rectOf(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    top: Math.round(r.top),
    right: Math.round(r.right),
    bottom: Math.round(r.bottom),
    left: Math.round(r.left)
  };
}

async function run(label, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", m => m.type() === "error" && errors.push("[console] " + m.text()));
  page.on("pageerror", e => errors.push("[pageerror] " + e.message));
  page.on("requestfailed", r => errors.push("[请求失败] " + r.url()));
  page.on("response", r => {
    if (r.status() >= 400) errors.push(`[HTTP ${r.status()}] ` + r.url());
  });

  await page.goto(BASE + path, { waitUntil: "networkidle" });

  if (path === "activity.html") {
    await page.evaluate(() => {
      const today = new Date();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const date = today.getFullYear() + "-" + m + "-" + d;
      localStorage.setItem("cuteblog.activities.v1", JSON.stringify([
        { id: "inspect-1", date, who: "white", period: "morning", category: "学习", minutes: 60, text: "整理博客主页面", createdAt: 1 },
        { id: "inspect-2", date, who: "brown", period: "afternoon", category: "娱乐", minutes: 45, text: "挑选照片墙封面", createdAt: 2 },
        { id: "inspect-3", date, who: "white", period: "evening", category: "约会", minutes: 90, text: "一起散步和聊天", createdAt: 3 },
        { id: "inspect-4", date, who: "brown", period: "evening", category: "家务", minutes: 35, text: "收拾小窝", createdAt: 4 }
      ]));
      location.reload();
    });
    await page.waitForLoadState("networkidle");
  }

  await page.waitForTimeout(700);

  const base = await page.evaluate(() => {
    const d = document.documentElement;
    return {
      横向溢出: d.scrollWidth > d.clientWidth + 1,
      scrollW: d.scrollWidth,
      clientW: d.clientWidth
    };
  });

  const probe = await page.evaluate((label) => {
    const out = {};
    const tags = document.querySelector("#blogTags");
    const nav = document.querySelector(".blog-nav") || document.querySelector(".bi-nav") || document.querySelector(".act-nav");
    const back = document.querySelector(".blog-back") || document.querySelector(".bi-back") || document.querySelector(".act-back");
    const title = document.querySelector(".article h1");
    const indexTitle = document.querySelector(".bi-head h1");
    const activityTitle = document.querySelector(".act-head h1");
    const shell = document.querySelector(".blog-shell");
    const indexShell = document.querySelector(".bi-shell");
    const activityShell = document.querySelector(".act-shell");
    const toc = document.querySelector(".toc");
    const tocFill = document.querySelector("#tocFill");
    const firstToc = document.querySelector(".toc__link.is-active");
    const side = document.querySelector(".bi-side");
    const firstPost = document.querySelector(".post-item:not(.is-hidden)");
    const tagPanel = document.querySelector(".tag-panel");

    function rectOf(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left)
      };
    }

    function styleOf(el, props) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const o = {};
      props.forEach(p => { o[p] = cs[p]; });
      return o;
    }

    out.viewport = {
      w: document.documentElement.clientWidth,
      h: window.innerHeight
    };
    out.top = {
      tags: rectOf(tags),
      nav: rectOf(nav),
      back: rectOf(back),
      title: rectOf(title || indexTitle || activityTitle),
      shell: rectOf(shell || indexShell || activityShell),
      toc: rectOf(toc),
      side: rectOf(side),
      firstPost: rectOf(firstPost),
      tagPanel: rectOf(tagPanel),
      activeTocText: firstToc ? firstToc.textContent.trim() : null,
      tagsClass: tags ? tags.className : null,
      tagStyle: styleOf(tags, ["top", "opacity", "display", "borderColor", "backgroundColor"]),
      titleStyle: styleOf(title || indexTitle || activityTitle, ["fontSize", "lineHeight", "color", "fontWeight"])
    };

    const overlap = (a, b) => !!a && !!b &&
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    out.top.标签压住标题 = overlap(rectOf(tags), rectOf(title || indexTitle || activityTitle));
    out.top.导航压住标题 = overlap(rectOf(nav), rectOf(title || indexTitle || activityTitle)) || overlap(rectOf(back), rectOf(title || indexTitle || activityTitle));

    return out;
  }, label);

  const hasHomeCover = await page.locator("#homeCover").count();
  if (hasHomeCover) {
    probe.homeCover = await page.evaluate(() => {
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      const cover = document.querySelector("#homeCover");
      const bg = document.querySelector(".home-cover__bg");
      const canvas = document.querySelector("#coverPetals");
      const button = document.querySelector("#exploreHome");
      const ctx = canvas && canvas.getContext("2d");
      let paintedPixels = 0;
      if (ctx) {
        const w = Math.min(canvas.width, 220);
        const h = Math.min(canvas.height, 160);
        const data = ctx.getImageData(0, 0, w, h).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) paintedPixels += 1;
        }
      }
      const coverStyle = getComputedStyle(cover);
      const titleStyle = getComputedStyle(document.querySelector(".home-cover__title"));
      const buttonStyle = getComputedStyle(button);
      const topText = document.querySelector(".home-cover__button-text--top");
      const bottomText = document.querySelector(".home-cover__button-text--bottom");
      return {
        coverRect: rectOf(cover),
        bgSrc: bg ? bg.getAttribute("src") : null,
        canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
        paintedPixels,
        coverStyle: {
          opacity: coverStyle.opacity,
          visibility: coverStyle.visibility,
          zIndex: coverStyle.zIndex
        },
        title: document.querySelector(".home-cover__title").textContent.trim(),
        titleStyle: {
          fontSize: titleStyle.fontSize,
          lineHeight: titleStyle.lineHeight,
          color: titleStyle.color
        },
        buttonRect: rectOf(button),
        buttonStyle: {
          backgroundColor: buttonStyle.backgroundColor,
          color: buttonStyle.color,
          borderRadius: buttonStyle.borderRadius
        },
        buttonText: {
          text: button ? button.textContent.trim().replace(/\s+/g, " ") : null,
          topTransform: topText ? getComputedStyle(topText).transform : null,
          topOpacity: topText ? getComputedStyle(topText).opacity : null,
          bottomTransform: bottomText ? getComputedStyle(bottomText).transform : null,
          bottomOpacity: bottomText ? getComputedStyle(bottomText).opacity : null
        },
        bodyClass: document.body.className
      };
    });
    await page.hover("#exploreHome");
    await page.waitForTimeout(420);
    probe.homeCover.buttonHover = await page.evaluate(() => {
      const topText = document.querySelector(".home-cover__button-text--top");
      const bottomText = document.querySelector(".home-cover__button-text--bottom");
      return {
        topTransform: topText ? getComputedStyle(topText).transform : null,
        topOpacity: topText ? getComputedStyle(topText).opacity : null,
        bottomTransform: bottomText ? getComputedStyle(bottomText).transform : null,
        bottomOpacity: bottomText ? getComputedStyle(bottomText).opacity : null
      };
    });
    await page.screenshot({ path: `${label}-cover-${shotName}`, fullPage: false });
    await page.mouse.move(Math.round(viewport.width * 0.5), Math.round(viewport.height * 0.5));
    await page.mouse.move(Math.round(viewport.width * 0.64), Math.round(viewport.height * 0.36));
    await page.click("#exploreHome");
    await page.waitForTimeout(1050);
    probe.homeCover.afterExplore = await page.evaluate(() => {
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      const cover = document.querySelector("#homeCover");
      const scene = document.querySelector("#scene");
      return {
        hiddenAttr: cover ? cover.hidden : null,
        bodyClass: document.body.className,
        sceneRect: rectOf(scene)
      };
    });
  }

  const hasHomeProfile = await page.locator(".home-profile").count();
  if (hasHomeProfile) {
    probe.homeProfile = await page.evaluate(() => {
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      function styleOf(el, props) {
        const cs = getComputedStyle(el);
        const out = {};
        props.forEach(p => { out[p] = cs[p]; });
        return out;
      }
      const bg = document.querySelector("#homeBg");
      const nav = document.querySelector(".home-nav");
      const hero = document.querySelector(".home-hero");
      const title = document.querySelector(".home-hero h1");
      const about = document.querySelector(".home-about");
      const modules = document.querySelector(".home-module-list");
      const posts = document.querySelector(".home-post-list");
      return {
        doc: {
          scrollH: document.documentElement.scrollHeight,
          bodyScrollH: document.body.scrollHeight,
          clientH: document.documentElement.clientHeight,
          bodyOverflowY: getComputedStyle(document.body).overflowY,
          htmlOverflowY: getComputedStyle(document.documentElement).overflowY
        },
        bg: {
          rect: rectOf(bg),
          image: bg ? getComputedStyle(bg).backgroundImage : null,
          filter: bg ? getComputedStyle(bg).filter : null,
          opacity: bg ? getComputedStyle(bg).opacity : null
        },
        nav: {
          rect: rectOf(nav),
          linkCount: document.querySelectorAll(".home-nav__links a").length
        },
        hero: {
          rect: rectOf(hero),
          title: title ? title.textContent.trim() : null,
          titleRect: rectOf(title),
          titleStyle: title ? styleOf(title, ["fontSize", "lineHeight", "color", "fontWeight"]) : null
        },
        aboutRect: rectOf(about),
        moduleCount: document.querySelectorAll(".home-module-list a").length,
        modulesRect: rectOf(modules),
        postCount: document.querySelectorAll(".home-post-list a").length,
        postsRect: rectOf(posts),
        dogElementCount: document.querySelectorAll(".dog, .dogs").length,
        reveal: {
          ready: document.documentElement.classList.contains("sr-ready"),
          total: document.querySelectorAll(".sr-reveal").length,
          visible: document.querySelectorAll(".sr-reveal.is-visible").length,
          firstHidden: Array.from(document.querySelectorAll(".sr-reveal:not(.is-visible)")).slice(0, 3).map(el => el.className)
        }
      };
    });
    probe.homeProfile.revealScroll = {};
    await page.evaluate(() => window.scrollTo({ top: 760, behavior: "instant" }));
    await page.waitForTimeout(850);
    probe.homeProfile.revealScroll.modules = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      visible: document.querySelectorAll(".sr-reveal.is-visible").length,
      modulesVisible: document.querySelector(".home-modules").classList.contains("is-visible"),
      firstModuleCardVisible: document.querySelector(".home-module-list a").classList.contains("is-visible"),
      moduleTransform: getComputedStyle(document.querySelector(".home-modules")).transform,
      moduleOpacity: getComputedStyle(document.querySelector(".home-modules")).opacity
    }));
    await page.evaluate(() => window.scrollTo({ top: 1160, behavior: "instant" }));
    await page.waitForTimeout(850);
    probe.homeProfile.revealScroll.posts = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      visible: document.querySelectorAll(".sr-reveal.is-visible").length,
      postsVisible: document.querySelector(".home-posts").classList.contains("is-visible"),
      firstPostVisible: document.querySelector(".home-post-list a").classList.contains("is-visible"),
      postsTransform: getComputedStyle(document.querySelector(".home-posts")).transform,
      postsOpacity: getComputedStyle(document.querySelector(".home-posts")).opacity
    }));
    await page.click('.home-periods button[data-period="evening"]');
    await page.waitForTimeout(450);
    probe.homeProfile.afterPeriodClick = await page.evaluate(() => {
      const bg = document.querySelector("#homeBg");
      const active = document.querySelector(".home-periods button.is-active");
      return {
        activePeriod: active ? active.getAttribute("data-period") : null,
        image: bg ? getComputedStyle(bg).backgroundImage : null
      };
    });
  }

  if (path === "blog-post.html") {
    probe.scrollStates = await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";

      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      async function snap(y) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 500));
        const tags = document.querySelector("#blogTags");
        const fill = document.querySelector("#tocFill");
        const active = document.querySelector(".toc__link.is-active");
        const cs = tags ? getComputedStyle(tags) : null;
        return {
          y: Math.round(window.scrollY),
          tagsClass: tags ? tags.className : null,
          tagsRect: rectOf(tags),
          tagsOpacity: cs ? cs.opacity : null,
          activeTocText: active ? active.textContent.trim() : null,
          fillHeight: fill ? fill.style.height : null
        };
      }
      return {
        初始: await snap(0),
        轻微下滑: await snap(120),
        阅读中: await snap(720)
      };
    });
  }

  if (path === "blog.html") {
    probe.indexStates = {};
    probe.indexStates.初始 = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll(".post-item")).filter(p => !p.classList.contains("is-hidden"));
      const count = document.querySelector("#postCount");
      const grid = document.querySelector("#tagGrid");
      const shell = document.querySelector(".bi-shell");
      const side = document.querySelector(".bi-side");
      const title = document.querySelector(".bi-head h1");
      const first = visible[0];
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      return {
        visiblePosts: visible.length,
        countText: count ? count.textContent : null,
        firstTitle: first ? first.querySelector("h2").textContent.trim() : null,
        tagButtonCount: grid ? grid.querySelectorAll("button").length : 0,
        shellRect: rectOf(shell),
        sideRect: rectOf(side),
        titleRect: rectOf(title),
        firstPostRect: rectOf(first),
        titleFont: title ? getComputedStyle(title).fontSize : null
      };
    });

    await page.click(".bi-filter--brown");
    await page.waitForTimeout(500);
    probe.indexStates.棕狗筛选 = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll(".post-item")).filter(p => !p.classList.contains("is-hidden"));
      return {
        visiblePosts: visible.length,
        countText: document.querySelector("#postCount").textContent,
        allIncludeBrown: visible.every(p => p.getAttribute("data-authors").split(" ").includes("brown"))
      };
    });

    await page.click('#tagGrid button[data-tag="照片墙"]');
    await page.waitForTimeout(500);
    probe.indexStates.棕狗加照片墙标签 = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll(".post-item")).filter(p => !p.classList.contains("is-hidden"));
      return {
        visiblePosts: visible.length,
        countText: document.querySelector("#postCount").textContent,
        allIncludeBrown: visible.every(p => p.getAttribute("data-authors").split(" ").includes("brown")),
        allIncludeTag: visible.every(p => p.getAttribute("data-tags").split(" ").includes("照片墙"))
      };
    });

    await page.click("#clearTags");
    await page.click('.bi-filter[data-filter="all"]');
    await page.waitForTimeout(500);
  }

  if (path === "activity.html") {
    probe.activityStates = await page.evaluate(() => {
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      const title = document.querySelector(".act-head h1");
      const form = document.querySelector(".act-form");
      const timeline = document.querySelector("#actTimeline");
      const side = document.querySelector(".act-side");
      const donut = document.querySelector("#actDonut");
      const blocks = Array.from(document.querySelectorAll(".time-block"));
      const bars = Array.from(document.querySelectorAll(".stat-bar"));
      const summary = document.querySelector("#daySummary");
      return {
        titleRect: rectOf(title),
        titleFont: title ? getComputedStyle(title).fontSize : null,
        formRect: rectOf(form),
        timelineRect: rectOf(timeline),
        sideRect: rectOf(side),
        donutRect: rectOf(donut),
        blockCount: blocks.length,
        barCount: bars.length,
        firstBlockText: blocks[0] ? blocks[0].textContent.trim() : null,
        summaryText: summary ? summary.textContent : null,
        donutBackground: donut ? getComputedStyle(donut).backgroundImage : null
      };
    });

    await page.click(".time-block__del");
    await page.waitForTimeout(500);
    probe.activityStates.删除后 = await page.evaluate(() => ({
      blockCount: document.querySelectorAll(".time-block").length,
      summaryText: document.querySelector("#daySummary").textContent
    }));
  }

  const cornerDogCount = await page.locator(".corner-dog").count();
  if (cornerDogCount) {
    await page.mouse.move(Math.round(viewport.width * 0.72), Math.round(viewport.height * 0.28));
    await page.waitForTimeout(180);
    probe.cornerDogs = await page.evaluate(() => {
      function rectOf(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left)
        };
      }
      return Array.from(document.querySelectorAll(".corner-dog")).map(btn => {
        const img = btn.querySelector(".corner-dog__img");
        const gaze = btn.querySelector(".corner-dog__gaze");
        return {
          className: btn.className,
          rect: rectOf(btn),
          img: img ? img.getAttribute("src") : null,
          transform: getComputedStyle(btn).transform,
          zIndex: getComputedStyle(btn).zIndex,
          gaze: gaze ? {
            rect: rectOf(gaze),
            transform: getComputedStyle(gaze).transform,
            opacity: getComputedStyle(gaze).opacity
          } : null
        };
      });
    });

    await page.click(".corner-dog--white");
    await page.waitForTimeout(250);
    probe.cornerDogClick = {};
    probe.cornerDogClick.after250ms = await page.evaluate(() => {
      const btn = document.querySelector(".corner-dog--white");
      const img = btn && btn.querySelector(".corner-dog__img");
      const gaze = btn && btn.querySelector(".corner-dog__gaze");
      return {
        playing: btn ? btn.classList.contains("is-playing") : false,
        src: img ? img.getAttribute("src") : null,
        gazeOpacity: gaze ? getComputedStyle(gaze).opacity : null
      };
    });
    await page.waitForTimeout(1550);
    probe.cornerDogClick.after1800ms = await page.evaluate(() => {
      const btn = document.querySelector(".corner-dog--white");
      const img = btn && btn.querySelector(".corner-dog__img");
      return {
        playing: btn ? btn.classList.contains("is-playing") : false,
        src: img ? img.getAttribute("src") : null
      };
    });
    await page.waitForTimeout(1800);
    probe.cornerDogClick.after3600ms = await page.evaluate(() => {
      const btn = document.querySelector(".corner-dog--white");
      const img = btn && btn.querySelector(".corner-dog__img");
      return {
        playing: btn ? btn.classList.contains("is-playing") : false,
        src: img ? img.getAttribute("src") : null
      };
    });
  }

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${label}-${shotName}`, fullPage: true });
  console.log(`\n==== ${label} (${viewport.width}x${viewport.height}) ====`);
  console.log("报错:", errors.length ? errors : "无");
  console.log("通用:", base);
  console.log("探针:", JSON.stringify(probe, null, 2));
  console.log("截图:", `${label}-${shotName}`);
  await page.close();
}

await run("desktop", { width: 1440, height: 900 });
await run("mobile", { width: 390, height: 844 });
await browser.close();
