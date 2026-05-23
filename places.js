/* ============================================================
   我们的小窝 — 今年想去页面
   ============================================================ */
(function () {
  "use strict";

  var placeList = document.getElementById("placeList");
  var placeCount = document.getElementById("placeCount");
  var placeToggle = document.getElementById("placeToggle");
  var placeForm = document.getElementById("placeForm");
  var placeName = document.getElementById("placeName");
  var placeNote = document.getElementById("placeNote");
  var placeTone = document.getElementById("placeTone");
  var placeCancel = document.getElementById("placeCancel");

  function setFormOpen(open) {
    placeForm.classList.toggle("is-hidden", !open);
    placeToggle.setAttribute("aria-expanded", open ? "true" : "false");
    placeToggle.textContent = open ? "收起添加" : "添加地点";
    if (open) placeName.focus();
  }

  function renderPlaces() {
    if (!placeList || !window.CBPlaces) return;
    var places = window.CBPlaces.all();
    placeList.textContent = "";
    places.forEach(function (place) {
      placeList.appendChild(window.CBPlaces.createCard(place));
    });
    placeCount.textContent = places.length + " 个目的地";
  }

  placeToggle.addEventListener("click", function () {
    setFormOpen(placeForm.classList.contains("is-hidden"));
  });

  placeCancel.addEventListener("click", function () {
    setFormOpen(false);
  });

  placeForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = placeName.value.trim();
    var note = placeNote.value.trim();
    if (!name || !note || !window.CBPlaces) return;
    window.CBPlaces.add({
      id: "place-" + Date.now(),
      name: name,
      note: note,
      tone: placeTone.value || "night",
      createdAt: Date.now()
    });
    placeForm.reset();
    setFormOpen(false);
    renderPlaces();
  });

  renderPlaces();
})();
