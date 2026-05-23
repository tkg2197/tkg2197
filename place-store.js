/* ============================================================
   我们的小窝 — 今年想去的地方本地存储
   当前使用 localStorage，后续可整体替换为 Supabase。
   ============================================================ */
(function () {
  "use strict";

  var KEY = "cuteblog.places.v1";
  var DEFAULTS = [
    {
      id: "default-kyoto",
      name: "京都",
      note: "想在傍晚慢慢走过小巷，找一家安静的店吃热乎乎的晚饭。",
      tone: "night"
    },
    {
      id: "default-dali",
      name: "大理",
      note: "去有风的地方，看湖面、云影和很慢很慢的下午。",
      tone: "desert"
    },
    {
      id: "default-iceland",
      name: "冰岛",
      note: "一起等极光出现，把冷风和星星都记进今年的愿望里。",
      tone: "sea"
    }
  ];

  function readSaved() {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeSaved(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function all() {
    return readSaved().concat(DEFAULTS);
  }

  function add(item) {
    var arr = readSaved();
    arr.unshift(item);
    writeSaved(arr);
  }

  function createCard(place) {
    var tone = place.tone || "night";
    var card = document.createElement("article");
    card.className = "place-card place-card--" + tone;
    card.setAttribute("tabindex", "0");

    var art = document.createElement("div");
    art.className = "place-card__art";

    var skyLight = document.createElement("span");
    skyLight.className = tone === "night" ? "place-card__moon" : "place-card__sun";
    var land = document.createElement("span");
    land.className = "place-card__land";
    art.appendChild(skyLight);
    art.appendChild(land);

    var content = document.createElement("div");
    content.className = "place-card__content";
    var name = document.createElement("h3");
    name.className = "place-card__name";
    name.textContent = place.name;
    var note = document.createElement("p");
    note.className = "place-card__note";
    note.textContent = place.note;
    content.appendChild(name);
    content.appendChild(note);

    card.appendChild(art);
    card.appendChild(content);
    return card;
  }

  window.CBPlaces = {
    add: add,
    all: all,
    createCard: createCard,
    key: KEY
  };
})();
