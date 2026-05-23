/* ============================================================
   我们的小窝 — 里程碑 1：时段背景系统
   时间逻辑 + 7 时段切换器 + 星星/花朵生成
   ============================================================ */
(function () {
  "use strict";

  var PERIODS = [
    { key: "morning",   label: "早晨" },
    { key: "forenoon",  label: "上午" },
    { key: "noon",      label: "中午" },
    { key: "afternoon", label: "下午" },
    { key: "dusk",      label: "傍晚" },
    { key: "evening",   label: "晚上" },
    { key: "midnight",  label: "半夜" }
  ];

  // 各时段的实景背景图。在此登记的时段会用 .art 显示实景图、
  // 隐藏代码绘制的天空，并显示对应的小狗；未登记的时段沿用代码天空。
  var ART_BG = {
    morning:   "assets/早晨草地.png",
    forenoon:  "assets/上午草地.png",
    noon:      "assets/中午草地.png",
    afternoon: "assets/下午草地.jpg",
    dusk:      "assets/傍晚草地.png",
    evening:   "assets/晚上草地.png"
  };

  // 真实时间 → 时段
  function periodForHour(h) {
    if (h >= 5  && h < 8)  return "morning";
    if (h >= 8  && h < 11) return "forenoon";
    if (h >= 11 && h < 14) return "noon";
    if (h >= 14 && h < 17) return "afternoon";
    if (h >= 17 && h < 19) return "dusk";
    if (h >= 19 && h < 23) return "evening";
    return "midnight"; // 23 点至次日 5 点
  }

  var scene     = document.getElementById("scene");
  var switcher  = document.getElementById("switcher");
  var labelText = document.getElementById("timeLabelText");
  var resetBtn  = document.getElementById("resetBtn");
  var starsEl   = document.getElementById("stars");
  var flowersEl = document.getElementById("flowers");
  var dogs      = document.getElementById("dogs");
  var artLayers = [document.getElementById("art1"), document.getElementById("art2")];
  var artFront  = 0;
  var dogTimer  = null;

  var skies   = {};
  var chips   = {};
  var labelOf = {};
  PERIODS.forEach(function (p) {
    skies[p.key]   = document.querySelector(".sky--" + p.key);
    labelOf[p.key] = p.label;
  });

  var state = { mode: "auto", key: null };

  // 交叉淡入淡出实景背景图
  function setArt(key) {
    var url = ART_BG[key];
    if (!url) {
      artLayers[0].style.opacity = "0";
      artLayers[1].style.opacity = "0";
      return;
    }
    var back = artLayers[artFront ^ 1];
    back.style.backgroundImage = 'url("' + url + '")';
    back.style.opacity = "1";
    artLayers[artFront].style.opacity = "0";
    artFront ^= 1;
  }

  // 小狗淡出 → 切换该时段的姿势/位置 → 淡入
  function swapDogs(key) {
    dogs.style.opacity = "0";
    clearTimeout(dogTimer);
    dogTimer = setTimeout(function () {
      dogs.className = "dogs dogs--" + key;
      dogs.style.opacity = "";
    }, 420);
  }

  function applyPeriod(key) {
    state.key = key;
    PERIODS.forEach(function (p) {
      var active = p.key === key;
      skies[p.key].classList.toggle("is-active", active);
      chips[p.key].classList.toggle("is-active", active);
      chips[p.key].setAttribute("aria-pressed", String(active));
    });
    scene.className = "scene period-" + key + (ART_BG[key] ? " has-art" : "");
    setArt(key);
    swapDogs(key);
    updateLabel();
  }

  function updateLabel() {
    var prefix = state.mode === "auto" ? "跟随当前时间" : "手动预览";
    labelText.textContent = prefix + " · " + labelOf[state.key];
    resetBtn.hidden = state.mode === "auto";
  }

  function goAuto() {
    state.mode = "auto";
    applyPeriod(periodForHour(new Date().getHours()));
  }

  function goManual(key) {
    state.mode = "manual";
    applyPeriod(key);
  }

  // ---- 构建时段切换器 ----
  PERIODS.forEach(function (p) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = p.label;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () { goManual(p.key); });
    switcher.appendChild(btn);
    chips[p.key] = btn;
  });
  resetBtn.addEventListener("click", goAuto);

  // ---- 生成星星 ----
  (function buildStars() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 78; i++) {
      var s = document.createElement("span");
      s.className = "star";
      s.style.setProperty("--s", (Math.random() * 2 + 1).toFixed(1) + "px");
      s.style.left = (Math.random() * 100).toFixed(2) + "%";
      s.style.top  = (Math.random() * 66).toFixed(2) + "%";
      s.style.setProperty("--dur",   (Math.random() * 3 + 2.5).toFixed(1) + "s");
      s.style.setProperty("--delay", (-Math.random() * 5).toFixed(1) + "s");
      frag.appendChild(s);
    }
    starsEl.appendChild(frag);
  })();

  // ---- 生成花朵 ----
  (function buildFlowers() {
    var colors = ["#ffffff", "#ffd9e6", "#fff3b0"];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 9; i++) {
      var f = document.createElement("span");
      f.className = "flower";
      f.style.left   = (6 + Math.random() * 88).toFixed(2) + "%";
      f.style.bottom = (3 + Math.random() * 13).toFixed(2) + "%";
      f.style.setProperty("--flower", colors[i % colors.length]);
      f.style.transform = "scale(" + (0.7 + Math.random() * 0.7).toFixed(2) + ")";
      frag.appendChild(f);
    }
    flowersEl.appendChild(frag);
  })();

  // ---- 自动模式下定时检查时段切换 ----
  setInterval(function () {
    if (state.mode !== "auto") return;
    var k = periodForHour(new Date().getHours());
    if (k !== state.key) applyPeriod(k);
  }, 30000);

  // ---- 初始化 ----
  goAuto();
})();
