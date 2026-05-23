/* ============================================================
   我们的小窝：页面角落陪伴小狗
   待机、随机说话、按钮联动、点击播放动作 GIF
   ============================================================ */
(function () {
  "use strict";

  var IDLE = {
    white: "gif/白狗-待机.png",
    brown: "gif/棕狗-待机.png"
  };

  var DOGS = [
    {
      key: "white",
      label: "白狗",
      idle: IDLE.white,
      actions: [
        { id: "white-code", src: "gif/白狗-写出代码.gif", duration: 2500, line: "白狗正在认真写代码！" },
        { id: "white-sing", src: "gif/白狗-唱歌.gif", duration: 2300, line: "白狗给你唱一小段歌。" },
        { id: "white-heart", src: "gif/白狗-抛出爱心.gif", duration: 2100, line: "白狗抛出一颗爱心！", after: "brown-catch-heart" },
        { id: "white-crawl", src: "gif/白狗-爬行.gif", duration: 3600, line: "白狗偷偷爬过来了。" },
        { id: "white-question", src: "gif/白狗-翻身问号.gif", duration: 2600, line: "白狗翻身：发生什么啦？" },
        { id: "white-jump", src: "gif/白狗-跳跳.gif", duration: 2300, line: "白狗开心地跳起来了！" }
      ]
    },
    {
      key: "brown",
      label: "棕狗",
      idle: IDLE.brown,
      actions: [
        { id: "brown-workout", src: "gif/棕狗-健身.gif", duration: 2600, line: "小狗正在努力健身！" },
        { id: "brown-food", src: "gif/棕狗-想开饭.gif", duration: 2600, line: "棕狗已经开始想开饭了。" },
        { id: "brown-heart", src: "gif/棕狗-甩爱心.gif", duration: 2500, line: "棕狗也甩出一颗爱心！" },
        { id: "brown-leave", src: "gif/棕狗-跳走.gif", duration: 2300, line: "棕狗跳走去探路啦。" },
        { id: "brown-duck", src: "gif/棕狗-鸭子跳跳.gif", duration: 2500, line: "棕狗和小鸭子一起跳跳。" }
      ],
      hiddenActions: {
        "brown-catch-heart": { id: "brown-catch-heart", src: "gif/棕狗-接住爱心.gif", duration: 2600, line: "棕狗接住了白狗的爱心！" }
      }
    }
  ];

  var RANDOM_LINES = [
    "今天也要把小事认真收好。",
    "小窝正在轻轻发光。",
    "喝口水，再继续看吧。",
    "我们在角落陪着你。",
    "今天适合收藏一点开心。",
    "慢慢来，页面会等你。",
    "白狗闻到了新的灵感。",
    "棕狗觉得这里很舒服。",
    "要不要去看看最近的照片？",
    "有些故事适合晚一点写。",
    "今天也可以很可爱。",
    "小狗巡逻中，一切正常。",
    "想去的地方会慢慢变近。",
    "记得给今天留一张照片。",
    "风很轻，适合发呆。",
    "这里藏着两个人的小世界。",
    "如果累了，就在小窝歇一会儿。",
    "我们刚刚发现一颗好心情。",
    "今天的云看起来很好摸。",
    "小狗正在认真守护角落。",
    "写一点点，也算向前走。",
    "你来了，小窝就热闹一点。",
    "别急，好东西会慢慢出现。",
    "今天的小狗电量很足。"
  ];

  var FEATURE_LINES = [
    { test: /今年想去|places/i, line: "来看看今年有哪些想去的地方吧！" },
    { test: /首页|home|index/i, line: "回到首页，看看我们的小窝吧！" },
    { test: /双人博客|博客|blog/i, line: "来读读我们一起写下的故事吧。" },
    { test: /生活记录|记录|records/i, line: "今天的小心情也要好好收起来。" },
    { test: /照片墙|照片|photos/i, line: "去照片墙翻翻最近的画面吧！" },
    { test: /时段活动|活动|activity/i, line: "看看今天每个时段都发生了什么吧。" },
    { test: /上传|选择照片|file/i, line: "要把新的照片放进小窝了吗？" },
    { test: /添加|保存|发布|写|submit/i, line: "把新的小事认真放进去吧。" },
    { test: /筛选|全部|白狗|棕狗|filter/i, line: "换个角度看看，也许有新发现。" },
    { test: /返回|back/i, line: "慢慢退回去，小狗陪你。" },
    { test: /取消|关闭|close/i, line: "先收起来也没关系。" }
  ];
  var SPEECH_HOLD_MS = 2000;

  var root = document.createElement("div");
  root.className = "corner-dogs";
  root.setAttribute("aria-label", "角落小狗");
  document.body.appendChild(root);

  var dogMap = {};
  var dogButtons = DOGS.map(function (dog) {
    var btn = document.createElement("button");
    btn.className = "corner-dog corner-dog--" + dog.key;
    btn.type = "button";
    btn.setAttribute("aria-label", dog.label + "，点击播放随机动作");

    var shadow = document.createElement("span");
    shadow.className = "corner-dog__shadow";

    var img = document.createElement("img");
    img.className = "corner-dog__img";
    img.src = dog.idle;
    img.alt = "";
    img.draggable = false;

    var bubble = document.createElement("span");
    bubble.className = "corner-dog__bubble";

    btn.appendChild(shadow);
    btn.appendChild(img);
    btn.appendChild(bubble);
    root.appendChild(btn);

    dog.el = btn;
    dog.img = img;
    dog.bubble = bubble;
    dogMap[dog.key] = dog;

    btn.addEventListener("click", function () {
      playRandomAction(dog);
    });

    return btn;
  });

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomDog() {
    return pick(DOGS);
  }

  function speak(dog, line, holdMs) {
    if (!dog || !dog.bubble) return;
    clearTimeout(dog._speechTimer);
    dog.bubble.textContent = line;
    dog.el.classList.add("is-speaking");
    dog._speechTimer = setTimeout(function () {
      dog.el.classList.remove("is-speaking");
    }, holdMs || SPEECH_HOLD_MS);
  }

  function scheduleRandomSpeech() {
    var delay = 30000 + Math.floor(Math.random() * 10001);
    clearTimeout(root._randomSpeechTimer);
    root._randomSpeechTimer = setTimeout(function () {
      speak(randomDog(), pick(RANDOM_LINES), SPEECH_HOLD_MS);
      scheduleRandomSpeech();
    }, delay);
  }

  function playRandomAction(dog) {
    playAction(dog, pick(dog.actions));
  }

  function playAction(dog, action) {
    if (!dog || !action) return;
    clearTimeout(dog._actionTimer);
    dog.el.classList.add("is-playing");
    speak(dog, action.line, SPEECH_HOLD_MS);
    dog.img.src = action.src + "?play=" + Date.now();
    dog._actionTimer = setTimeout(function () {
      dog.img.src = dog.idle;
      dog.el.classList.remove("is-playing");
      if (action.after === "brown-catch-heart") {
        playAction(dogMap.brown, dogMap.brown.hiddenActions["brown-catch-heart"]);
      }
    }, action.duration);
  }

  function featureLineFor(el) {
    var text = [
      el.textContent || "",
      el.getAttribute("aria-label") || "",
      el.getAttribute("href") || "",
      el.id || "",
      el.className || ""
    ].join(" ");
    for (var i = 0; i < FEATURE_LINES.length; i++) {
      if (FEATURE_LINES[i].test.test(text)) return FEATURE_LINES[i].line;
    }
    return "";
  }

  function bindFeatureTalk() {
    var selector = "a, button, [role='button']";
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) {
      if (el.closest(".corner-dogs")) return;
      if (el._cornerDogTalkBound) return;
      var line = featureLineFor(el);
      if (!line) return;
      el._cornerDogTalkBound = true;
      el.addEventListener("mouseenter", function () {
        speak(randomDog(), line, SPEECH_HOLD_MS);
      });
      el.addEventListener("focus", function () {
        speak(randomDog(), line, SPEECH_HOLD_MS);
      });
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  document.addEventListener("mousemove", function (ev) {
    dogButtons.forEach(function (btn) {
      var rect = btn.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var x = clamp((ev.clientX - cx) / 360, -1, 1);
      var y = clamp((ev.clientY - cy) / 300, -1, 1);
      btn.style.setProperty("--look-x", x.toFixed(3));
      btn.style.setProperty("--look-y", y.toFixed(3));
    });
  });

  bindFeatureTalk();
  scheduleRandomSpeech();
})();
