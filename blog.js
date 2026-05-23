/* ============================================================
   我们的小窝 — 双人博客阅读页交互
   顶部标签收拢 / 目录生成 / 当前章节高亮 / 阅读进度
   ============================================================ */
(function () {
  "use strict";

  var tags = document.getElementById("blogTags");
  var tocList = document.getElementById("tocList");
  var tocFill = document.getElementById("tocFill");
  var sections = [];
  var tocLinks = {};

  function queryParam(name) {
    var m = window.location.search.match(new RegExp("[?&]" + name + "=([^&]+)"));
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inlineMarkdown(text) {
    var html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return html;
  }

  function slug(text, fallback) {
    return String(text || fallback || "section")
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || fallback;
  }

  function appendParagraph(section, lines) {
    if (!lines.length) return;
    var p = document.createElement("p");
    p.innerHTML = inlineMarkdown(lines.join(" "));
    section.appendChild(p);
    lines.length = 0;
  }

  function appendList(section, lines, ordered) {
    var list = document.createElement(ordered ? "ol" : "ul");
    list.className = "article-list";
    lines.forEach(function (line) {
      var li = document.createElement("li");
      li.innerHTML = inlineMarkdown(line);
      list.appendChild(li);
    });
    section.appendChild(list);
  }

  function renderBlocks(section, lines) {
    var para = [];
    var list = [];
    var ordered = false;
    var quote = [];
    var inCode = false;
    var code = [];

    function flushList() {
      if (!list.length) return;
      appendList(section, list, ordered);
      list = [];
      ordered = false;
    }
    function flushQuote() {
      if (!quote.length) return;
      var block = document.createElement("blockquote");
      block.className = "article-quote";
      block.innerHTML = inlineMarkdown(quote.join(" "));
      section.appendChild(block);
      quote = [];
    }
    function flushCode() {
      if (!code.length) return;
      var pre = document.createElement("pre");
      var codeEl = document.createElement("code");
      codeEl.textContent = code.join("\n");
      pre.appendChild(codeEl);
      section.appendChild(pre);
      code = [];
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      if (/^```/.test(line)) {
        appendParagraph(section, para);
        flushList();
        flushQuote();
        if (inCode) flushCode();
        inCode = !inCode;
        return;
      }
      if (inCode) {
        code.push(raw);
        return;
      }
      if (!line.trim()) {
        appendParagraph(section, para);
        flushList();
        flushQuote();
        return;
      }
      var heading3 = line.match(/^###\s+(.+)$/);
      if (heading3) {
        appendParagraph(section, para);
        flushList();
        flushQuote();
        var h3 = document.createElement("h3");
        h3.textContent = heading3[1].trim();
        section.appendChild(h3);
        return;
      }
      var unordered = line.match(/^[-*]\s+(.+)$/);
      var orderedHit = line.match(/^\d+\.\s+(.+)$/);
      if (unordered || orderedHit) {
        appendParagraph(section, para);
        flushQuote();
        var nextOrdered = !!orderedHit;
        if (list.length && ordered !== nextOrdered) flushList();
        ordered = nextOrdered;
        list.push((unordered || orderedHit)[1]);
        return;
      }
      var quoteHit = line.match(/^>\s?(.+)$/);
      if (quoteHit) {
        appendParagraph(section, para);
        flushList();
        quote.push(quoteHit[1]);
        return;
      }
      flushList();
      flushQuote();
      para.push(line.trim());
    });

    appendParagraph(section, para);
    flushList();
    flushQuote();
    flushCode();
  }

  function renderMarkdown(post) {
    var article = document.querySelector(".article");
    var lines = String(post.markdown || "").split(/\r?\n/);
    var bodyLines = [];
    var current = null;
    var currentLines = [];
    var sectionCount = 0;

    lines.forEach(function (line) {
      if (/^#\s+/.test(line)) return;
      var h2 = line.match(/^##\s+(.+)$/);
      if (h2) {
        if (current) {
          current.lines = currentLines;
          bodyLines.push(current);
        }
        sectionCount += 1;
        current = { title: h2[1].trim(), id: slug(h2[1], "section-" + sectionCount), lines: [] };
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    });
    if (current) {
      current.lines = currentLines;
      bodyLines.push(current);
    } else {
      bodyLines.push({ title: "正文", id: "content", lines: currentLines });
    }

    article.textContent = "";

    var head = document.createElement("header");
    head.className = "article-head";
    var kicker = document.createElement("p");
    kicker.className = "article-kicker";
    kicker.textContent = "双人博客 / Markdown 上传";
    var title = document.createElement("h1");
    title.textContent = post.title;
    var summary = document.createElement("p");
    summary.className = "article-summary";
    summary.textContent = post.summary;
    var authors = document.createElement("div");
    authors.className = "article-authors";
    authors.setAttribute("aria-label", "作者");
    post.authors.forEach(function (who) {
      var data = window.CBBlog.authors[who];
      var span = document.createElement("span");
      span.className = "article-author article-author--" + who;
      span.textContent = data ? data.emoji + " " + data.name : who;
      authors.appendChild(span);
    });
    head.appendChild(kicker);
    head.appendChild(title);
    head.appendChild(summary);
    head.appendChild(authors);
    article.appendChild(head);

    bodyLines.forEach(function (block) {
      var section = document.createElement("section");
      section.className = "article-section";
      section.id = block.id;
      section.setAttribute("data-toc-title", block.title);
      var h2 = document.createElement("h2");
      h2.textContent = block.title;
      section.appendChild(h2);
      renderBlocks(section, block.lines);
      article.appendChild(section);
    });

    document.title = post.title + " · 我们的小窝";
  }

  function renderTags(post) {
    if (!tags) return;
    tags.textContent = "";
    post.authors.forEach(function (who) {
      var data = window.CBBlog.authors[who];
      var span = document.createElement("span");
      span.className = "blog-tag blog-tag--" + who;
      span.textContent = data ? data.name + " · 作者" : who;
      tags.appendChild(span);
    });
    var date = document.createElement("span");
    date.className = "blog-tag";
    date.textContent = window.CBBlog.displayDate(post.date);
    tags.appendChild(date);
    var minutes = document.createElement("span");
    minutes.className = "blog-tag";
    minutes.textContent = post.readMinutes + " 分钟阅读";
    tags.appendChild(minutes);
    post.tags.forEach(function (tag) {
      var span = document.createElement("span");
      span.className = "blog-tag";
      span.textContent = tag;
      tags.appendChild(span);
    });
  }

  function maybeRenderUploadedPost() {
    var id = queryParam("id");
    if (!id || !window.CBBlog) return;
    var post = window.CBBlog.find(id);
    if (!post) return;
    renderTags(post);
    renderMarkdown(post);
  }

  function buildToc() {
    sections = Array.prototype.slice.call(document.querySelectorAll(".article-section"));
    tocLinks = {};
    tocList.textContent = "";
    var frag = document.createDocumentFragment();
    sections.forEach(function (section) {
      var link = document.createElement("a");
      link.className = "toc__link";
      link.href = "#" + section.id;
      link.textContent = section.getAttribute("data-toc-title") || section.querySelector("h2").textContent;
      link.addEventListener("click", function (ev) {
        ev.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      tocLinks[section.id] = link;
      frag.appendChild(link);
    });
    tocList.appendChild(frag);
  }

  function setActive(id) {
    Object.keys(tocLinks).forEach(function (key) {
      tocLinks[key].classList.toggle("is-active", key === id);
    });
  }

  function currentSectionId() {
    var probe = window.scrollY + Math.min(260, window.innerHeight * 0.36);
    var active = sections[0] && sections[0].id;
    sections.forEach(function (section) {
      if (section.offsetTop <= probe) active = section.id;
    });
    return active;
  }

  function updateProgress() {
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var pct = Math.max(0, Math.min(1, window.scrollY / max));
    tocFill.style.height = (pct * 100).toFixed(2) + "%";
  }

  function updateTags() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    // 轻微下滑：收成胶囊；继续下滑：胶囊整体向上滑出消失。
    tags.classList.toggle("is-gathered", y > 64);
    tags.classList.toggle("is-hidden", y > 260);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateTags();
      updateProgress();
      setActive(currentSectionId());
      ticking = false;
    });
  }

  maybeRenderUploadedPost();
  buildToc();
  updateTags();
  updateProgress();
  setActive(currentSectionId());
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
