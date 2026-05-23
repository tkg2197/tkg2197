/* ============================================================
   我们的小窝 — 博客文章本地存储
   支持上传 Markdown 文件，后续可整体替换为 Supabase。
   ============================================================ */
(function () {
  "use strict";

  var KEY = "cuteblog.blog.posts.v1";
  var AUTHORS = {
    white: { name: "白狗", emoji: "🐶" },
    brown: { name: "棕狗", emoji: "🐕" }
  };

  function read() {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function write(posts) {
    localStorage.setItem(KEY, JSON.stringify(posts));
  }

  function slugPart(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "post";
  }

  function todayStr() {
    var d = new Date();
    function pad2(n) { return n < 10 ? "0" + n : String(n); }
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function normalizeDate(value) {
    var text = String(value || "").trim();
    var m = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (!m) return todayStr();
    function pad2(n) { n = Number(n); return n < 10 ? "0" + n : String(n); }
    return m[1] + "-" + pad2(m[2]) + "-" + pad2(m[3]);
  }

  function displayDate(date) {
    return String(date || "").replace(/-/g, ".");
  }

  function splitList(value) {
    return String(value || "")
      .split(/[,，、\n]/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function normalizeAuthors(value) {
    var source = splitList(value);
    var out = [];
    source.forEach(function (item) {
      var lower = item.toLowerCase();
      if (lower === "white" || item === "白狗" || item === "作者A") out.push("white");
      if (lower === "brown" || item === "棕狗" || item === "作者B") out.push("brown");
    });
    if (!out.length) out = ["white", "brown"];
    return out.filter(function (item, index) { return out.indexOf(item) === index; });
  }

  function stripFrontMatter(markdown) {
    var text = String(markdown || "").replace(/^\uFEFF/, "");
    if (text.indexOf("---") !== 0) return { meta: {}, body: text };
    var end = text.indexOf("\n---", 3);
    if (end < 0) return { meta: {}, body: text };
    var raw = text.slice(3, end).split(/\r?\n/);
    var meta = {};
    raw.forEach(function (line) {
      var hit = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (hit) meta[hit[1].toLowerCase()] = hit[2].replace(/^["']|["']$/g, "").trim();
    });
    return { meta: meta, body: text.slice(end + 4).replace(/^\s+/, "") };
  }

  function firstHeading(body) {
    var lines = body.split(/\r?\n/);
    for (var i = 0; i < lines.length; i += 1) {
      var hit = lines[i].match(/^#\s+(.+)$/);
      if (hit) return hit[1].trim();
    }
    return "";
  }

  function plainText(markdown) {
    return String(markdown || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/[*_~>#-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readMinutes(markdown) {
    var count = plainText(markdown).length;
    return Math.max(1, Math.ceil(count / 500));
  }

  function parseMarkdown(markdown, fileName) {
    var parsed = stripFrontMatter(markdown);
    var meta = parsed.meta;
    var body = parsed.body;
    var title = meta.title || firstHeading(body) || fileName.replace(/\.[^.]+$/, "");
    var summary = meta.summary || meta.description || plainText(body).slice(0, 86);
    var date = normalizeDate(meta.date);
    var tags = splitList(meta.tags || meta.tag);
    if (!tags.length) tags = ["Markdown"];
    return {
      id: "md-" + Date.now() + "-" + slugPart(fileName),
      title: title,
      date: date,
      summary: summary,
      authors: normalizeAuthors(meta.authors || meta.author),
      tags: tags.slice(0, 8),
      markdown: body,
      fileName: fileName,
      readMinutes: Number(meta.readminutes || meta.minutes) || readMinutes(body),
      createdAt: Date.now()
    };
  }

  function save(post) {
    var posts = read();
    posts.unshift(post);
    write(posts);
    return post;
  }

  function find(id) {
    return read().filter(function (post) { return post.id === id; })[0] || null;
  }

  window.CBBlog = {
    authors: AUTHORS,
    all: read,
    displayDate: displayDate,
    find: find,
    parseMarkdown: parseMarkdown,
    save: save
  };
})();
