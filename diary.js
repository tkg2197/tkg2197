/* ============================================================
   我们的小窝 — 生活记录 + 心情
   小狗点击 → 打开日记面板
   数据暂存浏览器本地（localStorage）；之后整体替换为 Supabase
   时只需改写下方 Store 对象。
   ============================================================ */
(function () {
  "use strict";

  // 两位作者（名字可按需修改）
  var AUTHORS = {
    white: { name: "白狗", emoji: "🐶", accent: "#7aa6d4" },
    brown: { name: "棕狗", emoji: "🐕", accent: "#d49356" }
  };

  // 心情选项
  var MOODS = [
    { key: "happy", emoji: "😄", label: "开心" },
    { key: "loved", emoji: "🥰", label: "幸福" },
    { key: "calm",  emoji: "😌", label: "平静" },
    { key: "tired", emoji: "🥱", label: "疲惫" },
    { key: "down",  emoji: "😢", label: "难过" },
    { key: "moody", emoji: "😤", label: "烦躁" }
  ];
  var MOOD_BY_KEY = {};
  MOODS.forEach(function (m) { MOOD_BY_KEY[m.key] = m; });

  /* ---- 存储层：localStorage（之后整体换 Supabase，仅改此对象）---- */
  var Store = {
    k: function (who) { return "cuteblog.diary." + who; },
    list: function (who) {
      try {
        var arr = JSON.parse(localStorage.getItem(this.k(who)) || "[]");
        return Array.isArray(arr) ? arr : [];
      } catch (e) { return []; }
    },
    today: function (who) {
      var t = todayStr();
      return this.list(who).filter(function (e) { return e.date === t; })[0] || null;
    },
    upsertToday: function (who, mood, text) {
      var entries = this.list(who);
      var t = todayStr();
      var hit = entries.filter(function (e) { return e.date === t; })[0];
      if (hit) {
        hit.mood = mood; hit.text = text; hit.ts = Date.now();
      } else {
        entries.push({ date: t, mood: mood, text: text, ts: Date.now() });
      }
      localStorage.setItem(this.k(who), JSON.stringify(entries));
    }
  };

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function prettyDate(s) {
    var p = s.split("-");
    return p[0] + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  /* ---- 构建面板 ---- */
  var root = document.createElement("div");
  root.className = "diary-backdrop";
  root.hidden = true;
  root.innerHTML =
    '<div class="diary-panel" role="dialog" aria-modal="true" aria-labelledby="diaryTitle">' +
      '<header class="diary-head">' +
        '<span class="diary-head__avatar" id="diaryAvatar"></span>' +
        '<h2 class="diary-head__title" id="diaryTitle"></h2>' +
        '<button class="diary-close" type="button" aria-label="关闭">✕</button>' +
      '</header>' +
      '<div class="diary-body">' +
        '<button class="diary-write-btn" type="button">✏️ 写今天的记录</button>' +
        '<form class="diary-form" hidden>' +
          '<p class="diary-form__label">今天的心情</p>' +
          '<div class="diary-moods"></div>' +
          '<textarea class="diary-text" rows="4" maxlength="500" ' +
            'placeholder="今天过得怎么样呀？记点什么吧~"></textarea>' +
          '<p class="diary-form__label diary-form__label--photos">今天的照片' +
            '<span class="diary-form__hint">选好就存进照片墙</span></p>' +
          '<div class="diary-photos"></div>' +
          '<input type="file" class="diary-photo-input" accept="image/*" multiple hidden />' +
          '<div class="diary-form__actions">' +
            '<button type="button" class="diary-btn diary-cancel">取消</button>' +
            '<button type="submit" class="diary-btn diary-save">保存</button>' +
          '</div>' +
        '</form>' +
        '<ul class="diary-timeline"></ul>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var panelEl    = root.querySelector(".diary-panel");
  var avatarEl   = root.querySelector("#diaryAvatar");
  var titleEl    = root.querySelector("#diaryTitle");
  var closeBtn   = root.querySelector(".diary-close");
  var writeBtn   = root.querySelector(".diary-write-btn");
  var formEl     = root.querySelector(".diary-form");
  var moodsEl    = root.querySelector(".diary-moods");
  var textEl     = root.querySelector(".diary-text");
  var cancelBtn  = root.querySelector(".diary-cancel");
  var saveBtn    = root.querySelector(".diary-save");
  var timelineEl = root.querySelector(".diary-timeline");
  var photosEl   = root.querySelector(".diary-photos");
  var photoInput = root.querySelector(".diary-photo-input");

  var currentWho  = "white";
  var currentMood = null;
  var photoBusy        = false;   // 照片处理中
  var photoRenderToken = 0;       // 丢弃过期的异步渲染
  var photoUrls        = [];      // 待回收的 objectURL

  /* ---- 心情按钮 ---- */
  MOODS.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mood-opt";
    b.dataset.mood = m.key;
    b.innerHTML =
      '<span class="mood-opt__emoji">' + m.emoji + '</span>' +
      '<span class="mood-opt__label">' + m.label + '</span>';
    b.addEventListener("click", function () { selectMood(m.key); });
    moodsEl.appendChild(b);
  });

  function paintMoods() {
    moodsEl.querySelectorAll(".mood-opt").forEach(function (el) {
      el.classList.toggle("is-selected", el.dataset.mood === currentMood);
    });
  }
  function selectMood(key) {
    currentMood = key;
    paintMoods();
    refreshSaveBtn();
  }
  function refreshSaveBtn() {
    saveBtn.disabled = !currentMood || !textEl.value.trim();
  }
  textEl.addEventListener("input", refreshSaveBtn);

  /* ---- 表单显隐 ---- */
  function showForm() {
    var t = Store.today(currentWho);
    currentMood = t ? t.mood : null;
    textEl.value = t ? t.text : "";
    paintMoods();
    refreshSaveBtn();
    renderDiaryPhotos();
    formEl.hidden = false;
    writeBtn.hidden = true;
    textEl.focus();
  }
  function hideForm() {
    formEl.hidden = true;
    writeBtn.hidden = false;
  }
  writeBtn.addEventListener("click", showForm);
  cancelBtn.addEventListener("click", hideForm);

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!currentMood || !textEl.value.trim()) return;
    Store.upsertToday(currentWho, currentMood, textEl.value.trim());
    hideForm();
    renderTimeline(currentWho);
  });

  /* ---- 今天的照片（与照片墙共用 window.CBPhoto）---- */
  function renderDiaryPhotos() {
    var token = ++photoRenderToken;
    photoUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    photoUrls = [];
    photosEl.textContent = "";
    if (!window.CBPhoto) return;
    var who = currentWho, t = todayStr();
    window.CBPhoto.all().then(function (list) {
      if (token !== photoRenderToken) return;   // 已过期
      photosEl.textContent = "";
      list.filter(function (p) { return p.who === who && p.date === t; })
          .sort(function (a, b) { return a.addedAt - b.addedAt; })
          .forEach(function (p) {
        var tile = document.createElement("div");
        tile.className = "diary-photo";
        var img = document.createElement("img");
        var u = URL.createObjectURL(p.thumb);
        photoUrls.push(u);
        img.src = u;
        img.alt = "照片";
        var del = document.createElement("button");
        del.type = "button";
        del.className = "diary-photo__del";
        del.textContent = "✕";
        del.setAttribute("aria-label", "删除这张照片");
        del.addEventListener("click", function () { removeDiaryPhoto(p.id); });
        tile.appendChild(img);
        tile.appendChild(del);
        photosEl.appendChild(tile);
      });
      var add = document.createElement("button");
      add.type = "button";
      add.className = "diary-photo-add" + (photoBusy ? " is-busy" : "");
      add.textContent = photoBusy ? "…" : "＋";
      add.setAttribute("aria-label", "添加照片");
      add.addEventListener("click", function () {
        if (!photoBusy) photoInput.click();
      });
      photosEl.appendChild(add);
    }).catch(function () { /* 忽略读取失败 */ });
  }

  function removeDiaryPhoto(id) {
    if (!window.CBPhoto) return;
    if (!window.confirm("删除这张照片吗？它也会从照片墙移除。")) return;
    window.CBPhoto.remove(id).then(function () { renderDiaryPhotos(); });
  }

  photoInput.addEventListener("change", function () {
    var files = [].slice.call(photoInput.files || []);
    photoInput.value = "";
    if (!files.length || !window.CBPhoto) return;
    var who = currentWho, date = todayStr();
    photoBusy = true;
    renderDiaryPhotos();
    files.reduce(function (chain, file) {
      return chain.then(function () {
        if (file.type && file.type.indexOf("image/") !== 0) return;
        return window.CBPhoto.upload(file, who, date).catch(function () {});
      });
    }, Promise.resolve()).then(function () {
      photoBusy = false;
      renderDiaryPhotos();
    });
  });

  /* ---- 时间线 ---- */
  function renderTimeline(who) {
    var entries = Store.list(who).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
    });
    timelineEl.textContent = "";

    if (!entries.length) {
      var empty = document.createElement("li");
      empty.className = "diary-empty";
      empty.textContent = "还没有记录，写下第一篇吧~";
      timelineEl.appendChild(empty);
      return;
    }

    entries.forEach(function (en) {
      var mood = MOOD_BY_KEY[en.mood] || { emoji: "", label: "" };
      var li = document.createElement("li");
      li.className = "diary-entry";

      var head = document.createElement("div");
      head.className = "diary-entry__head";
      var date = document.createElement("span");
      date.className = "diary-entry__date";
      date.textContent = prettyDate(en.date);
      var moodEl = document.createElement("span");
      moodEl.className = "diary-entry__mood";
      moodEl.textContent = (mood.emoji + " " + mood.label).trim();
      head.appendChild(date);
      head.appendChild(moodEl);

      var body = document.createElement("p");
      body.className = "diary-entry__text";
      body.textContent = en.text;

      li.appendChild(head);
      li.appendChild(body);
      timelineEl.appendChild(li);
    });
  }

  /* ---- 打开 / 关闭 ---- */
  var closeTimer = null;
  function open(who) {
    clearTimeout(closeTimer);
    currentWho = who;
    var a = AUTHORS[who];
    avatarEl.textContent = a.emoji;
    titleEl.textContent = a.name + "的生活记录";
    panelEl.style.setProperty("--accent", a.accent);
    hideForm();
    renderTimeline(who);
    root.hidden = false;
    void root.offsetWidth;            // 强制回流，确保过渡触发
    root.classList.add("is-open");
  }
  function close() {
    root.classList.remove("is-open");
    closeTimer = setTimeout(function () { root.hidden = true; }, 360);
  }
  closeBtn.addEventListener("click", close);
  root.addEventListener("click", function (e) {
    if (e.target === root) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !root.hidden) close();
  });

  /* ---- 小狗点击交互 ---- */
  function bounce(el) {
    el.classList.remove("dog--bounce");
    void el.offsetWidth;
    el.classList.add("dog--bounce");
  }
  function bindDog(selector, who) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener("click", function () {
      bounce(el);
      open(who);
    });
  }
  bindDog(".dog--white", "white");
  bindDog(".dog--brown", "brown");
})();
