/* ============================================================
   我们的小窝 — 飘浮的小鬼魂装饰
   原型来自项目根的「一个有趣的鬼魂动画（css+js）」。本版本：
   ① 整体缩到 65%（约 91×104px），通过 .cb-ghost 命名空间隔离；
   ② 用 TreeWalker 抓所有可见文字的 Range 矩形，并加上主要的
      非文字内容（图、卡片、按钮、表单），随机点候选位置，碰撞
      就重选，最多 80 次，确保鬼魂只出现在空白处；
   ③ 滚动 / 缩放时如果当前位置遮住文字，自动「跑掉」换位置；
   ④ 鼠标进入或点击：跑掉，再到新的空白处。
   ============================================================ */
(function () {
  "use strict";

  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var GHOST_SCALE = 0.65;
  var W = Math.round(140 * GHOST_SCALE);   // 91
  var H = Math.round(160 * GHOST_SCALE);   // 104
  var EDGE = 12;          // 离视口边的安全距
  var PADDING = 14;       // 鬼魂外扩，给文字留呼吸
  var TRY_LIMIT = 80;     // 最多试多少个候选点

  // 鼠标悬停时随机说一句（≥15 句），跑掉前停留 ~1.2s 给用户读
  var BUBBLE_PHRASES = [
    "抓不住我~",
    "嘿嘿，找到我啦？",
    "我可是会消失的哦",
    "别过来啦~",
    "你好呀～",
    "嘘…我在玩躲猫猫",
    "啊！被你看见了",
    "拜拜咯～",
    "不要靠近我啦",
    "我没那么容易被抓住的",
    "你也想一起飘吗？",
    "我会守着这个小窝呀",
    "嗯哼？",
    "下次见！",
    "你猜我下一秒在哪？",
    "今天也要开心呀～",
    "嘘——",
    "我要藏起来咯",
    "看到啦看到啦",
    "晚安~"
  ];
  var BUBBLE_HOLD = 700;    // 气泡停留时间(ms)，到点鬼魂就跑掉
  var lastPhraseIdx = -1;
  function pickPhrase() {
    if (BUBBLE_PHRASES.length === 1) return BUBBLE_PHRASES[0];
    var idx;
    do { idx = Math.floor(Math.random() * BUBBLE_PHRASES.length); }
    while (idx === lastPhraseIdx);
    lastPhraseIdx = idx;
    return BUBBLE_PHRASES[idx];
  }

  var SCENE_HTML =
    '<div class="cb-ghost" aria-hidden="true">' +
      '<div class="ghost-container">' +
        '<div class="ghost">' +
          '<div class="ghost-head"><div class="ghost-face">' +
            '<div class="eyes-row">' +
              '<div class="eye left"></div><div class="eye right"></div>' +
            '</div>' +
            '<div class="mouth-row">' +
              '<div class="cheek left"></div>' +
              '<div class="mouth">' +
                '<div class="mouth-top"></div><div class="mouth-bottom"></div>' +
              '</div>' +
              '<div class="cheek right"></div>' +
            '</div>' +
          '</div></div>' +
          '<div class="ghost-body">' +
            '<div class="ghost-hand hand-left"></div>' +
            '<div class="ghost-hand hand-right"></div>' +
            '<div class="ghost-skirt">' +
              '<div class="pleat down"></div><div class="pleat up"></div>' +
              '<div class="pleat down"></div><div class="pleat up"></div>' +
              '<div class="pleat down"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="stars">' +
          '<div class="star orange pointy star-1"><div class="star-element"></div></div>' +
          '<div class="star orange pointy star-2"><div class="star-element"></div></div>' +
          '<div class="star yellow pointy star-3"><div class="star-element"></div></div>' +
          '<div class="star yellow pointy star-4"><div class="star-element"></div></div>' +
          '<div class="star blue round star-5"><div class="star-element"></div></div>' +
          '<div class="star blue round star-6"><div class="star-element"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="shadow-container">' +
        '<div class="shadow"></div><div class="shadow-bottom"></div>' +
      '</div>' +
    '</div>';

  function overlap(a, b) {
    return a.left < b.right && a.right > b.left &&
           a.top < b.bottom && a.bottom > b.top;
  }

  // 灯箱 / 上传弹层 / 角落小狗 / 鬼魂自己里的元素不参与障碍检测
  var EXCLUDE_SEL = ".cb-ghost, .pw-lb, .pw-modal";
  // 「内容」型选择器：图、卡片、按钮等，鬼魂也避开这些
  var CONTENT_SEL = [
    "a", "button", "input", "select", "textarea", "img", "video", "canvas",
    ".corner-dog",
    ".pw-photo", ".pw-stack", ".pw-stack-cell",
    ".post-item", ".tag-panel",
    ".home-module", ".home-post",
    ".place-card", ".place-stage > *",
    ".time-block", ".stat-bar",
    ".rec-card", ".diary-card"
  ].join(",");

  function visible(el, cs) {
    return cs.display !== "none" &&
           cs.visibility !== "hidden" &&
           parseFloat(cs.opacity) >= 0.05;
  }

  // 收集所有「不能放鬼魂」的矩形：可见文字 + 主要内容元素
  function gatherObstacles() {
    var vh = window.innerHeight;
    var rects = [];

    // 1) 文字：用 TreeWalker 拿到每个非空文本节点的 Range 矩形
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p || (p.closest && p.closest(EXCLUDE_SEL))) return NodeFilter.FILTER_REJECT;
        var cs;
        try { cs = getComputedStyle(p); } catch (e) { return NodeFilter.FILTER_REJECT; }
        if (!visible(p, cs)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      try {
        var range = document.createRange();
        range.selectNodeContents(node);
        var list = range.getClientRects();
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if (r.width > 0 && r.height > 0 &&
              r.bottom > 0 && r.top < vh) {
            rects.push(r);
          }
        }
      } catch (e) {}
    }

    // 2) 内容元素：图、卡片、按钮等
    var els = document.querySelectorAll(CONTENT_SEL);
    for (var j = 0; j < els.length; j++) {
      var el = els[j];
      if (el.closest && el.closest(EXCLUDE_SEL)) continue;
      var ecs;
      try { ecs = getComputedStyle(el); } catch (e) { continue; }
      if (!visible(el, ecs)) continue;
      var r2 = el.getBoundingClientRect();
      if (r2.width > 4 && r2.height > 4 &&
          r2.bottom > 0 && r2.top < vh) {
        rects.push(r2);
      }
    }

    return rects;
  }

  function findBlankSpot() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxX = vw - W - EDGE;
    var maxY = vh - H - EDGE;
    if (maxX < EDGE || maxY < EDGE) return null;

    var obstacles = gatherObstacles();

    for (var k = 0; k < TRY_LIMIT; k++) {
      var x = EDGE + Math.random() * (maxX - EDGE);
      var y = EDGE + Math.random() * (maxY - EDGE);
      var rect = {
        left:   x - PADDING,
        top:    y - PADDING,
        right:  x + W + PADDING,
        bottom: y + H + PADDING
      };
      var clear = true;
      for (var i = 0; i < obstacles.length; i++) {
        if (overlap(rect, obstacles[i])) { clear = false; break; }
      }
      if (clear) return { x: x, y: y };
    }
    return null;
  }

  function initGhost() {
    var temp = document.createElement("div");
    temp.innerHTML = SCENE_HTML;
    var scene = temp.firstChild;
    document.body.appendChild(scene);

    var ghost    = scene.querySelector(".ghost");
    var leftEye  = scene.querySelector(".eye.left");
    var rightEye = scene.querySelector(".eye.right");
    var leftHand = scene.querySelector(".hand-left");
    var shadow   = scene.querySelector(".shadow-container");

    var isEscaping = false;
    var activityTimer = null;
    var showTimers = [];
    var triggered = false;    // 已经在说话+待跑掉时，忽略再次触发
    var hideBubbleTimer = null;
    var runawayTimer = null;

    // ---- 说话气泡 ------------------------------------------
    var bubble = document.createElement("div");
    bubble.className = "cb-ghost__bubble";
    bubble.setAttribute("aria-hidden", "true");
    document.body.appendChild(bubble);

    function placeBubble() {
      var rect = scene.getBoundingClientRect();
      if (rect.width < 1) return;
      // 横坐标贴鬼魂中线；纵坐标紧贴鬼魂头顶（气泡有 -100% 自身高度的位移）
      var cx = rect.left + rect.width / 2;
      var cy = rect.top - 4;
      // 防止气泡贴到屏幕边：留 12px 边距
      var bw = bubble.offsetWidth;
      if (bw > 0) {
        cx = Math.max(bw / 2 + 12, Math.min(window.innerWidth - bw / 2 - 12, cx));
      }
      bubble.style.left = cx + "px";
      bubble.style.top  = cy + "px";
    }
    function showBubble() {
      clearTimeout(hideBubbleTimer);
      bubble.textContent = pickPhrase();
      placeBubble();
      // 重排后再加 is-visible，确保 transition 跑得起来
      void bubble.offsetWidth;
      bubble.classList.add("is-visible");
    }
    function hideBubble() {
      bubble.classList.remove("is-visible");
      // CSS transition 完了再清空文本，避免淡出过程里气泡瞬间变空
      clearTimeout(hideBubbleTimer);
      hideBubbleTimer = setTimeout(function () {
        if (!bubble.classList.contains("is-visible")) bubble.textContent = "";
      }, 320);
    }

    function blink() {
      leftEye.classList.add("blink");
      rightEye.classList.add("blink");
      setTimeout(function () {
        leftEye.classList.remove("blink");
        rightEye.classList.remove("blink");
      }, 50);
    }
    function wave() {
      leftHand.classList.add("waving");
      setTimeout(function () { leftHand.classList.remove("waving"); }, 500);
    }
    function stopActivity() {
      if (activityTimer) { clearInterval(activityTimer); activityTimer = null; }
    }
    function startActivity() {
      stopActivity();
      activityTimer = setInterval(function () {
        switch (Math.floor(Math.random() * 4)) {
          case 0:
            blink();
            setTimeout(blink, 400);
            setTimeout(blink, 1300);
            break;
          case 1:
            wave();
            break;
        }
      }, 7000);
    }
    function clearShowTimers() {
      showTimers.forEach(function (id) { clearTimeout(id); });
      showTimers = [];
    }

    function showAt(spot) {
      clearShowTimers();
      isEscaping = false;
      scene.classList.remove("run-away", "move-stars-in", "stars-out", "move-stars-out");
      ghost.classList.remove("hover");
      shadow.classList.add("disappear");
      scene.style.left = Math.round(spot.x) + "px";
      scene.style.top  = Math.round(spot.y) + "px";
      scene.classList.add("descend");
      scene.style.opacity = "1";
      showTimers.push(
        setTimeout(function () { shadow.classList.remove("disappear"); }, 5),
        setTimeout(function () {
          scene.classList.remove("descend");
          scene.classList.add("stars-out", "move-stars-out");
        }, 600),
        setTimeout(function () {
          ghost.classList.add("hover");
          startActivity();
        }, 1200)
      );
    }

    function tryShow() {
      var spot = findBlankSpot();
      if (!spot) {
        scene.style.opacity = "0";
        // 没空位时，过会儿再试一次（用户也许会滚动 / 弹层会关闭）
        setTimeout(tryShow, 4000);
        return;
      }
      showAt(spot);
    }

    function runAway() {
      if (isEscaping) return;
      isEscaping = true;
      triggered = false;
      clearTimeout(runawayTimer);
      runawayTimer = null;
      hideBubble();
      stopActivity();
      clearShowTimers();
      scene.classList.add("run-away", "move-stars-in");
      scene.classList.remove("stars-out");
      setTimeout(function () {
        shadow.classList.add("disappear");
        setTimeout(function () {
          scene.classList.remove("run-away", "move-stars-in");
          ghost.classList.remove("hover");
          tryShow();
        }, 500 + Math.random() * 800);
      }, 450);
    }

    // 触发：先弹气泡说一句，让用户看清，然后跑掉
    function onTrigger() {
      if (isEscaping || triggered) return;
      triggered = true;
      showBubble();
      runawayTimer = setTimeout(runAway, BUBBLE_HOLD);
    }
    scene.addEventListener("mouseenter", onTrigger);
    scene.addEventListener("click", onTrigger);

    tryShow();

    // 滚动 / 缩放后如果遮住了文字就跑掉
    var idleTimer = null;
    function recheck() {
      if (isEscaping || !scene.parentNode) return;
      var rect = scene.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      var padded = {
        left:   rect.left   - PADDING,
        top:    rect.top    - PADDING,
        right:  rect.right  + PADDING,
        bottom: rect.bottom + PADDING
      };
      var obstacles = gatherObstacles();
      for (var i = 0; i < obstacles.length; i++) {
        if (overlap(padded, obstacles[i])) { runAway(); return; }
      }
    }
    function onScrollOrResize() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(recheck, 350);
    }
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
  }

  function start() {
    // 等全站进入动画跑完再放鬼魂
    if (document.documentElement.classList.contains("pt-loading")) {
      setTimeout(start, 200);
      return;
    }
    setTimeout(initGhost, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
