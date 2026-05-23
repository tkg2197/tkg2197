/* ============================================================
   我们的小窝：首页模糊时段背景
   真实时间自动选择，也允许手动预览不同背景
   ============================================================ */
(function () {
  "use strict";

  var BG = {
    morning: "assets/早晨草地.png",
    forenoon: "assets/上午草地.png",
    noon: "assets/中午草地.png",
    afternoon: "assets/下午草地.jpg",
    dusk: "assets/傍晚草地.png",
    evening: "assets/晚上草地.png",
    midnight: "assets/半夜草地.png"
  };

  function periodForHour(h) {
    if (h >= 5  && h < 8)  return "morning";
    if (h >= 8  && h < 11) return "forenoon";
    if (h >= 11 && h < 14) return "noon";
    if (h >= 14 && h < 17) return "afternoon";
    if (h >= 17 && h < 19) return "dusk";
    if (h >= 19 && h < 23) return "evening";
    return "midnight";
  }

  var bg = document.getElementById("homeBg");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".home-periods button"));
  var placeList = document.getElementById("placeList");
  var placeCount = document.getElementById("placeCount");
  var placeToggle = document.getElementById("placeToggle");
  var placeForm = document.getElementById("placeForm");
  var placeName = document.getElementById("placeName");
  var placeNote = document.getElementById("placeNote");
  var placeTone = document.getElementById("placeTone");
  var placeCancel = document.getElementById("placeCancel");
  var recentPhotos = document.getElementById("homeRecentPhotos");
  var recentPhotoUrls = [];

  var STATUS_KEY = "cuteblog.home.status.v1";
  var DEFAULT_STATUS = {
    white: {
      weather: "所在地待设置 · 天气待同步",
      quotes: [
        "今天也要把小事认真收好。",
        "慢慢来，小窝会一点点长大。",
        "如果风正好，就多晒一会儿太阳。"
      ]
    },
    brown: {
      weather: "所在地待设置 · 天气待同步",
      quotes: [
        "先把想去的地方写下来，路会慢慢出现。",
        "今天适合做一点可爱的事。",
        "出发之前，先把期待装进口袋。"
      ]
    }
  };
  var MOOD_LABELS = {
    happy: "开心",
    loved: "幸福",
    calm: "平静",
    tired: "疲惫",
    down: "难过",
    moody: "烦躁"
  };
  var PERIOD_ORDER = ["morning", "forenoon", "noon", "afternoon", "dusk", "evening", "midnight"];
  var quoteTimers = {};
  var RECENT_PHOTO_FALLBACK = [
    { src: "assets/小白首页形象.png", date: "小白", who: "white" },
    { src: "assets/小棕首页形象.jpg", date: "小棕", who: "brown" },
    { src: "assets/早晨-白狗.png", date: "早晨", who: "white" },
    { src: "assets/中午-棕狗.png", date: "中午", who: "brown" },
    { src: "assets/晚上-白狗.png", date: "晚上", who: "white" }
  ];

  function setPeriod(key) {
    if (!bg || !BG[key]) return;
    bg.style.setProperty("--home-bg-url", 'url("' + BG[key] + '")');
    buttons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-period") === key);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setPeriod(btn.getAttribute("data-period"));
    });
  });

  function readStatus() {
    try {
      var saved = JSON.parse(localStorage.getItem(STATUS_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch (e) {
      return {};
    }
  }

  function writeStatus(data) {
    localStorage.setItem(STATUS_KEY, JSON.stringify(data));
  }

  function todayStr() {
    var d = new Date();
    function pad2(n) { return n < 10 ? "0" + n : String(n); }
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function readList(key) {
    try {
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function latestByTime(list) {
    return list.slice().sort(function (a, b) {
      return Number(b.ts || b.createdAt || 0) - Number(a.ts || a.createdAt || 0);
    })[0] || null;
  }

  function diaryMoodForToday(who, date) {
    var hit = latestByTime(readList("cuteblog.diary." + who).filter(function (entry) {
      return entry.date === date && entry.mood;
    }));
    if (!hit) return "";
    return MOOD_LABELS[hit.mood] || hit.mood;
  }

  function activityDoingForToday(who, date) {
    var list = readList("cuteblog.activities.v1").filter(function (entry) {
      return entry.date === date && entry.who === who;
    });
    if (!list.length) return "";

    var currentPeriod = periodForHour(new Date().getHours());
    var currentHit = latestByTime(list.filter(function (entry) {
      return entry.period === currentPeriod;
    }));
    var hit = currentHit || list.slice().sort(function (a, b) {
      var ai = PERIOD_ORDER.indexOf(a.period);
      var bi = PERIOD_ORDER.indexOf(b.period);
      if (ai !== bi) return bi - ai;
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    })[0];

    return hit ? (hit.text || hit.category || "") : "";
  }

  function manualValue(saved, who, field, date) {
    var data = saved[who] || {};
    var item = data[field];
    if (item && typeof item === "object" && item.date === date) {
      return String(item.value || "").trim();
    }
    return "";
  }

  function saveManualValue(who, field, value) {
    var saved = readStatus();
    saved[who] = saved[who] || {};
    if (value) {
      saved[who][field] = { date: todayStr(), value: value };
    } else {
      delete saved[who][field];
    }
    writeStatus(saved);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function revokeRecentPhotoUrls() {
    recentPhotoUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    recentPhotoUrls = [];
  }

  function prettyPhotoDate(date) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "最近";
    var parts = date.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function photoAuthor(who) {
    return who === "brown" ? "棕狗" : "白狗";
  }

  function typeQuote(id, text, instant) {
    var el = document.getElementById(id);
    if (!el) return;
    if (quoteTimers[id]) {
      window.clearInterval(quoteTimers[id]);
      quoteTimers[id] = null;
    }
    el.setAttribute("data-full-text", text);
    if (instant) {
      el.textContent = text;
      return;
    }
    var i = 0;
    el.textContent = "";
    quoteTimers[id] = window.setInterval(function () {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(quoteTimers[id]);
        quoteTimers[id] = null;
      }
    }, 48);
  }

  function pickAnother(list, current) {
    if (!list.length) return "";
    if (list.length === 1) return list[0];
    var next = pick(list);
    var guard = 0;
    while (next === current && guard < 8) {
      next = pick(list);
      guard += 1;
    }
    return next;
  }

  function renderHomeStatus() {
    var saved = readStatus();
    var date = todayStr();
    ["white", "brown"].forEach(function (who) {
      var base = DEFAULT_STATUS[who];
      var data = saved[who] || {};
      var prefix = who === "white" ? "white" : "brown";
      var mood = manualValue(saved, who, "mood", date) || diaryMoodForToday(who, date) || "今天很神秘";
      var doing = manualValue(saved, who, "doing", date) || activityDoingForToday(who, date) || "在想你";
      setText(prefix + "Weather", data.weather || base.weather);
      setText(prefix + "Mood", mood);
      setText(prefix + "Doing", doing);
      typeQuote(prefix + "Quote", data.quote || pick(base.quotes), true);
    });
  }

  function replayQuote(who) {
    var id = (who === "white" ? "white" : "brown") + "Quote";
    var el = document.getElementById(id);
    var base = DEFAULT_STATUS[who] || DEFAULT_STATUS.white;
    var current = el ? (el.getAttribute("data-full-text") || el.textContent) : "";
    typeQuote(id, pickAnother(base.quotes, current), false);
  }

  function clearPhotoFocus() {
    if (!recentPhotos) return;
    recentPhotos.classList.remove("is-active");
    Array.prototype.slice.call(recentPhotos.querySelectorAll(".home-photo-card")).forEach(function (card) {
      card.classList.remove("is-focus");
      card.style.removeProperty("--lean");
      card.style.removeProperty("--pitch");
      card.style.removeProperty("--lean-x");
      card.style.removeProperty("--depth");
      card.style.removeProperty("--tilt");
    });
  }

  function setPhotoFocus(index) {
    if (!recentPhotos) return;
    var cards = Array.prototype.slice.call(recentPhotos.querySelectorAll(".home-photo-card"));
    recentPhotos.classList.add("is-active");
    cards.forEach(function (card, i) {
      var delta = index - i;
      var abs = Math.abs(delta);
      var side = i < index ? -1 : 1;
      card.classList.toggle("is-focus", i === index);
      if (i === index) return;
      card.style.setProperty("--lean", (side * -15) + "deg");
      card.style.setProperty("--pitch", (2 + abs * 0.8).toFixed(1) + "deg");
      card.style.setProperty("--lean-x", String(side * Math.min(24, 6 + abs * 5)));
      card.style.setProperty("--depth", String(-34 - abs * 18));
      card.style.setProperty("--tilt", (side * 1.2) + "deg");
    });
  }

  function buildRecentPhotoCard(item, index) {
    var card = document.createElement("article");
    card.className = "home-photo-card";
    card.tabIndex = 0;
    card.setAttribute("aria-label", "查看最近照片：" + prettyPhotoDate(item.date));
    card.setAttribute("data-index", String(index));

    var img = document.createElement("img");
    img.loading = "lazy";
    img.alt = photoAuthor(item.who) + "的最近照片";
    img.src = item.src;

    var meta = document.createElement("span");
    meta.className = "home-photo-card__meta";
    var dateText = document.createElement("span");
    dateText.textContent = prettyPhotoDate(item.date);
    var whoText = document.createElement("small");
    whoText.textContent = photoAuthor(item.who);
    meta.appendChild(dateText);
    meta.appendChild(whoText);

    card.appendChild(img);
    card.appendChild(meta);
    card.addEventListener("mouseenter", function () { setPhotoFocus(index); });
    card.addEventListener("focus", function () { setPhotoFocus(index); });
    card.addEventListener("click", function () { setPhotoFocus(index); });
    return card;
  }

  function renderRecentPhotoCards(items) {
    if (!recentPhotos) return;
    recentPhotos.textContent = "";
    items.forEach(function (item, index) {
      recentPhotos.appendChild(buildRecentPhotoCard(item, index));
    });
    recentPhotos.addEventListener("mouseleave", clearPhotoFocus);
    recentPhotos.addEventListener("focusout", function (ev) {
      if (!recentPhotos.contains(ev.relatedTarget)) clearPhotoFocus();
    });
  }

  function renderFallbackPhotos() {
    renderRecentPhotoCards(RECENT_PHOTO_FALLBACK);
  }

  function renderRecentPhotos() {
    if (!recentPhotos) return;
    if (!window.CBPhoto || !window.CBPhoto.all) {
      renderFallbackPhotos();
      return;
    }
    window.CBPhoto.all().then(function (list) {
      revokeRecentPhotoUrls();
      var recent = (Array.isArray(list) ? list : []).slice().sort(function (a, b) {
        return Number(b.addedAt || 0) - Number(a.addedAt || 0);
      }).slice(0, 5).map(function (photo) {
        var src = URL.createObjectURL(photo.thumb || photo.full);
        recentPhotoUrls.push(src);
        return { src: src, date: photo.date, who: photo.who };
      });
      if (recent.length) renderRecentPhotoCards(recent);
      else renderFallbackPhotos();
    }).catch(renderFallbackPhotos);
  }

  function editStatusField(who, field) {
    var prefix = who === "white" ? "white" : "brown";
    var label = field === "mood" ? "今日心情" : "正在干什么";
    var current = document.getElementById(prefix + (field === "mood" ? "Mood" : "Doing"));
    var value = window.prompt("编辑" + (who === "white" ? "白狗" : "棕狗") + "的" + label + "，留空则恢复自动显示：", current ? current.textContent : "");
    if (value === null) return;
    saveManualValue(who, field, value.trim());
    renderHomeStatus();
  }

  Array.prototype.slice.call(document.querySelectorAll(".home-status__edit")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      editStatusField(btn.getAttribute("data-who"), btn.getAttribute("data-field"));
    });
  });

  Array.prototype.slice.call(document.querySelectorAll(".home-status__quote")).forEach(function (quote) {
    quote.addEventListener("click", function () {
      replayQuote(quote.getAttribute("data-who"));
    });
    quote.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        replayQuote(quote.getAttribute("data-who"));
      }
    });
  });

  function setPlaceFormOpen(open) {
    if (!placeForm || !placeToggle) return;
    placeForm.classList.toggle("is-hidden", !open);
    placeToggle.setAttribute("aria-expanded", open ? "true" : "false");
    placeToggle.textContent = open ? "收起添加" : "添加地点";
    if (open && placeName) placeName.focus();
  }

  function renderPlaces() {
    if (!placeList || !window.CBPlaces) return;
    var places = window.CBPlaces.all();
    placeList.textContent = "";
    places.forEach(function (place) {
      placeList.appendChild(window.CBPlaces.createCard(place));
    });
    if (placeCount) {
      placeCount.textContent = places.length + " 个目的地";
    }
  }

  if (placeToggle && placeForm) {
    placeToggle.addEventListener("click", function () {
      setPlaceFormOpen(placeForm.classList.contains("is-hidden"));
    });
  }

  if (placeCancel) {
    placeCancel.addEventListener("click", function () {
      setPlaceFormOpen(false);
    });
  }

  if (placeForm) {
    placeForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = placeName.value.trim();
      var note = placeNote.value.trim();
      if (!name || !note) return;
      window.CBPlaces.add({
        id: "place-" + Date.now(),
        name: name,
        note: note,
        tone: placeTone.value || "night",
        createdAt: Date.now()
      });
      placeForm.reset();
      setPlaceFormOpen(false);
      renderPlaces();
    });
  }

  setPeriod(periodForHour(new Date().getHours()));
  renderHomeStatus();
  renderRecentPhotos();
  renderPlaces();
})();
