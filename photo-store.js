/* ============================================================
   我们的小窝 — 照片存储共享模块
   IndexedDB 读写 + 图片压缩，供「照片墙」和「生活记录」共用。
   照片二进制 localStorage 装不下，故用 IndexedDB；仍是单设备本地原型。
   之后换 Supabase 时只改这个文件。挂在 window.CBPhoto 上。
   记录结构：{ id, date, who, thumb:Blob, full:Blob, w, h, addedAt }
   ============================================================ */
(function () {
  "use strict";

  var DB_NAME = "cuteblog-photos", DB_VER = 1, STORE_NAME = "photos";
  var _dbp = null;

  function openDB() {
    if (_dbp) return _dbp;
    _dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("浏览器不支持 IndexedDB")); return; }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var os = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
          os.createIndex("by-date", "date", { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return _dbp;
  }

  function all() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE_NAME, "readonly")
                    .objectStore(STORE_NAME).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function add(rec) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readwrite");
        var req = tx.objectStore(STORE_NAME).add(rec);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function remove(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---- 图片压缩：原图 → canvas 缩放 → JPEG Blob ---- */
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("无法读取图片")); };
      img.src = url;
    });
  }
  function resize(img, maxSide, quality) {
    return new Promise(function (resolve, reject) {
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(function (blob) {
        if (blob) resolve({ blob: blob, w: cw, h: ch });
        else reject(new Error("压缩失败"));
      }, "image/jpeg", quality);
    });
  }
  function processFile(file, who, date) {
    return fileToImage(file).then(function (r) {
      return Promise.all([
        resize(r.img, 1600, 0.82),   // 大图（灯箱用）
        resize(r.img, 540, 0.74)     // 缩略图（墙 / 网格 / 记录用）
      ]).then(function (out) {
        URL.revokeObjectURL(r.url);
        return {
          date: date, who: who,
          full: out[0].blob, thumb: out[1].blob,
          w: out[0].w, h: out[0].h,
          addedAt: Date.now()
        };
      });
    });
  }

  /* 处理并存入一张，返回带 id 的完整记录 */
  function upload(file, who, date) {
    return processFile(file, who, date).then(function (rec) {
      return add(rec).then(function (id) { rec.id = id; return rec; });
    });
  }

  window.CBPhoto = {
    all: all,
    add: add,
    remove: remove,
    processFile: processFile,
    upload: upload
  };
})();
