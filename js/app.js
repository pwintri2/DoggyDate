/* ==========================================================================
   Doggy Date 🐾 — App logic
   - Language toggle (EN/NL) with localStorage persistence
   - Translation application across [data-i18n*] hooks
   - Mobile nav
   - Booking modal: focus trap, validation, star rating, receipt, toasts
   - Modal markup is injected here so any "Book" button works on every page.
   ========================================================================== */
(function () {
  "use strict";

  var I18N = window.DOGGY_I18N || { en: {}, nl: {} };
  var LANG_KEY = "doggy-lang";
  var BOOK_KEY = "doggy-bookings";

  /* ----- service catalogue (drives the modal) ----- */
  var SERVICES = {
    walk: { emoji: "🐕🤝🐕", nameKey: "svc.walk.title", descKey: "svc.walk.desc", priceKey: "svc.walk.price", unitKey: "svc.walk.unit", variant: "is-walk" },
    pup:  { emoji: "🧑‍🤝‍🧑🐶", nameKey: "svc.pup.title",  descKey: "svc.pup.desc",  priceKey: "svc.pup.price",  unitKey: "svc.pup.unit",  variant: "is-pup"  },
    rent: { emoji: "🏠🐕",    nameKey: "svc.rent.title", descKey: "svc.rent.desc", priceKey: "svc.rent.price", unitKey: "svc.rent.unit", variant: "is-rent" }
  };

  var PAGE_TITLES = {
    home: "title.home",
    services: "title.services",
    how: "title.how",
    guarantee: "title.guarantee"
  };

  /* ----- state ----- */
  var state = {
    lang: "en",
    service: "walk",
    rating: 5,
    lastBooking: null,
    lastTrigger: null
  };

  /* ===================== i18n ===================== */
  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (saved === "en" || saved === "nl") return saved;
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("nl") === 0 ? "nl" : "en";
  }

  function t(key, params) {
    var dict = I18N[state.lang] || {};
    var str = dict[key];
    if (str == null) str = (I18N.en && I18N.en[key]);
    if (str == null) return key;
    if (params) {
      str = str.replace(/\{(\w+)\}/g, function (m, p) {
        return params[p] != null ? params[p] : m;
      });
    }
    return str;
  }

  function applyTranslations(root) {
    root = root || document;
    var i, el, nodes;

    nodes = root.querySelectorAll("[data-i18n]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.textContent = t(el.getAttribute("data-i18n"));
    }
    nodes = root.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    }
    nodes = root.querySelectorAll("[data-i18n-ph]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    }
    nodes = root.querySelectorAll("[data-i18n-aria]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    }
  }

  function setLang(lang, announce) {
    if (lang !== "en" && lang !== "nl") lang = "en";
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    document.documentElement.setAttribute("lang", lang);

    // toggle buttons
    var btns = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
    }

    applyTranslations(document);
    updateDocTitle();
    updateSpotPlaceholder();
    refreshStarLabels();

    // if a confirmation is on screen, re-render its dynamic values
    var confirmView = document.getElementById("bookConfirm");
    if (confirmView && !confirmView.hasAttribute("hidden") && state.lastBooking) {
      renderReceipt(state.lastBooking);
    } else {
      syncServiceReadout();
    }

    if (announce) toast(t("toast.lang"), "success");
  }

  function updateDocTitle() {
    var page = document.body.getAttribute("data-page");
    var key = PAGE_TITLES[page];
    if (key) document.title = t(key);
  }

  /* ===================== mobile nav ===================== */
  function initMobileNav() {
    var burger = document.querySelector("[data-burger]");
    var menu = document.querySelector("[data-mobile-nav]");
    if (!burger || !menu) return;
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close after navigating
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ===================== language toggle wiring ===================== */
  function initLangToggle() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lang]");
      if (!btn) return;
      setLang(btn.getAttribute("data-lang"), true);
    });
  }

  /* ===================== toasts ===================== */
  function ensureToastWrap() {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      wrap.setAttribute("aria-atomic", "false");
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function toast(message, type) {
    var wrap = ensureToastWrap();
    var el = document.createElement("div");
    el.className = "toast" + (type === "success" ? " toast--success" : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 3000);
  }

  /* ===================== booking modal ===================== */
  var MODAL_HTML =
    '<div class="modal-overlay" id="bookModal" role="dialog" aria-modal="true" aria-labelledby="bookModalTitle">' +
      '<div class="modal">' +
        '<div class="modal__header">' +
          '<h2 id="bookModalTitle" data-i18n="modal.title"></h2>' +
          '<button type="button" class="modal__close" data-close data-i18n-aria="modal.close">✕</button>' +
        '</div>' +
        '<div class="modal__body">' +

          /* ---- FORM VIEW ---- */
          '<form id="bookForm" novalidate>' +
            '<div class="service-head" id="serviceHead" role="group" aria-labelledby="serviceLabel">' +
              '<span class="service-head__emoji svc-emoji" aria-hidden="true"></span>' +
              '<div class="service-head__body">' +
                '<span class="service-head__eyebrow" id="serviceLabel" data-i18n="form.service"></span>' +
                '<span class="service-head__name svc-name"></span>' +
                '<span class="service-head__desc svc-desc"></span>' +
              '</div>' +
              '<span class="service-head__price"><span class="svc-price"></span> <small class="svc-unit"></small></span>' +
            '</div>' +

            '<div class="field">' +
              '<label for="f-dogName">' +
                '<span data-i18n="form.dogName"></span> <span class="req" aria-hidden="true">*</span>' +
              '</label>' +
              '<input class="input" id="f-dogName" name="dogName" type="text" required ' +
                'data-i18n-ph="form.dogName.ph" aria-describedby="err-dogName" autocomplete="off">' +
              '<p class="error-msg" id="err-dogName" data-i18n="form.err.dogName"></p>' +
            '</div>' +

            '<div class="field">' +
              '<label for="f-breed">' +
                '<span data-i18n="form.breed"></span> <span class="hint" data-i18n="form.breed.opt"></span>' +
              '</label>' +
              '<input class="input" id="f-breed" name="breed" type="text" data-i18n-ph="form.breed.ph" autocomplete="off">' +
            '</div>' +

            '<div class="field">' +
              '<label for="f-email">' +
                '<span data-i18n="form.email"></span> <span class="hint" data-i18n="form.email.hint"></span>' +
              '</label>' +
              '<input class="input" id="f-email" name="email" type="email" data-i18n-ph="form.email.ph" autocomplete="email" aria-describedby="err-email">' +
              '<p class="error-msg" id="err-email" data-i18n="form.err.email"></p>' +
            '</div>' +

            '<div class="field">' +
              '<label id="sizeLabel" data-i18n="form.size"></label>' +
              '<div class="radio-grid radio-grid--3" role="radiogroup" id="sizeGroup" aria-labelledby="sizeLabel">' +
                radioCard("size", "small", "🐕", "form.size.small", "form.size.small.hint", false) +
                radioCard("size", "medium", "🦮", "form.size.medium", "form.size.medium.hint", true) +
                radioCard("size", "large", "🐕‍🦺", "form.size.large", "form.size.large.hint", false) +
              '</div>' +
            '</div>' +

            '<div class="field">' +
              '<label id="regionLabel" data-i18n="form.region"></label>' +
              '<div class="radio-grid radio-grid--2" role="radiogroup" id="regionGroup" aria-labelledby="regionLabel">' +
                radioCard("region", "us", "🇺🇸", "form.region.us", null, true) +
                radioCard("region", "nl", "🇳🇱", "form.region.nl", null, false) +
              '</div>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' +
              '<div class="field" style="margin-bottom:0">' +
                '<label for="f-date"><span data-i18n="form.date"></span> <span class="req" aria-hidden="true">*</span></label>' +
                '<input class="input" id="f-date" name="date" type="date" required aria-describedby="err-date">' +
                '<p class="error-msg" id="err-date" data-i18n="form.err.date"></p>' +
              '</div>' +
              '<div class="field" style="margin-bottom:0">' +
                '<label for="f-time"><span data-i18n="form.time"></span> <span class="req" aria-hidden="true">*</span></label>' +
                '<input class="input" id="f-time" name="time" type="time" required aria-describedby="err-time">' +
                '<p class="error-msg" id="err-time" data-i18n="form.err.time"></p>' +
              '</div>' +
            '</div>' +

            '<div class="field" style="margin-top:1.15rem">' +
              '<label for="f-spot"><span data-i18n="form.spot"></span> <span class="req" aria-hidden="true">*</span></label>' +
              '<input class="input" id="f-spot" name="spot" type="text" required aria-describedby="err-spot" autocomplete="off">' +
              '<p class="error-msg" id="err-spot" data-i18n="form.err.spot"></p>' +
            '</div>' +

            '<div class="field">' +
              '<label for="f-requests"><span data-i18n="form.requests"></span> <span class="hint" data-i18n="form.requests.opt"></span></label>' +
              '<textarea class="textarea" id="f-requests" name="requests" rows="3" data-i18n-ph="form.requests.ph"></textarea>' +
            '</div>' +

            '<div class="field">' +
              '<label id="ratingLabel" data-i18n="form.rating"></label>' +
              '<div class="stars" id="starRating" role="radiogroup" aria-labelledby="ratingLabel"></div>' +
            '</div>' +

            '<div class="modal__actions">' +
              '<p id="formErrorSummary" class="sr-only" role="alert" aria-live="assertive"></p>' +
              '<button type="submit" class="btn btn--block btn--lg" data-i18n="form.submit"></button>' +
            '</div>' +
          '</form>' +

          /* ---- CONFIRM VIEW ---- */
          '<div id="bookConfirm" hidden>' +
            '<div class="confirm">' +
              '<div class="confirm__stamp" aria-hidden="true">🐾</div>' +
              '<h2 id="bookConfirmTitle" tabindex="-1" data-i18n="confirm.title"></h2>' +
              '<p class="confirm__msg" id="confirmMsg"></p>' +
              '<div class="receipt">' +
                receiptRow("confirm.service", "rcpService") +
                receiptRow("confirm.pup", "rcpPup") +
                receiptRow("confirm.where", "rcpWhere") +
                receiptRow("confirm.when", "rcpWhen") +
                receiptRow("confirm.rating", "rcpRating") +
                '<div class="row total"><span class="k" data-i18n="confirm.total"></span><span class="v" id="rcpTotal"></span></div>' +
              '</div>' +
              '<button type="button" class="btn btn--block" data-close id="confirmBack" data-i18n="confirm.back"></button>' +
              '<p class="quote" data-i18n="confirm.quote"></p>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</div>';

  function radioCard(name, value, ico, labelKey, hintKey, checked) {
    return '<label class="radio-card">' +
      '<input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + '>' +
      '<span class="ico" aria-hidden="true">' + ico + '</span>' +
      '<span data-i18n="' + labelKey + '"></span>' +
      (hintKey ? '<span class="hint" data-i18n="' + hintKey + '"></span>' : "") +
      '</label>';
  }

  function receiptRow(labelKey, valueId) {
    return '<div class="row"><span class="k" data-i18n="' + labelKey + '"></span>' +
      '<span class="v" id="' + valueId + '"></span></div>';
  }

  var modal, overlay, form, confirmView, formView;

  function injectModal() {
    var holder = document.createElement("div");
    holder.innerHTML = MODAL_HTML;
    document.body.appendChild(holder.firstChild);

    overlay = document.getElementById("bookModal");
    modal = overlay.querySelector(".modal");
    form = document.getElementById("bookForm");
    confirmView = document.getElementById("bookConfirm");
    formView = form;

    buildStars();

    // close interactions
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", closeModal);
    });

    // radio selection (visual fallback where CSS :has() is unsupported) + region → spot placeholder
    overlay.addEventListener("change", function (e) {
      if (e.target.type === "radio") {
        var group = overlay.querySelectorAll('input[name="' + e.target.name + '"]');
        for (var i = 0; i < group.length; i++) {
          var card = group[i].closest(".radio-card");
          if (card) card.classList.toggle("is-checked", group[i].checked);
        }
      }
      if (e.target.name === "region") updateSpotPlaceholder();
    });

    // keyboard focus-ring fallback for :has(:focus-visible)
    overlay.addEventListener("focusin", function (e) {
      if (e.target.type === "radio") {
        var c = e.target.closest(".radio-card");
        if (c) c.classList.add("is-focus");
      }
    });
    overlay.addEventListener("focusout", function (e) {
      if (e.target.type === "radio") {
        var c = e.target.closest(".radio-card");
        if (c) c.classList.remove("is-focus");
      }
    });

    // clear invalid state on input
    form.addEventListener("input", function (e) {
      clearError(e.target);
    });

    form.addEventListener("submit", onSubmit);
  }

  function buildStars() {
    var box = document.getElementById("starRating");
    box.innerHTML = "";
    for (var n = 1; n <= 5; n++) {
      (function (val) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "star";
        b.textContent = "⭐";
        b.setAttribute("role", "radio");
        b.setAttribute("data-val", val);
        b.addEventListener("click", function () { setRating(val, true); });
        b.addEventListener("keydown", onStarKey);
        box.appendChild(b);
      })(n);
    }
    setRating(state.rating);
  }

  function onStarKey(e) {
    var cur = state.rating, next = cur;
    switch (e.key) {
      case "ArrowRight": case "ArrowUp": next = Math.min(5, cur + 1); break;
      case "ArrowLeft": case "ArrowDown": next = Math.max(1, cur - 1); break;
      case "Home": next = 1; break;
      case "End": next = 5; break;
      default: return;
    }
    e.preventDefault();
    setRating(next, true);
  }

  // Visual fill is cumulative (1..n); semantic value is a single checked radio (n).
  function setRating(n, focusStar) {
    state.rating = n;
    var stars = document.querySelectorAll("#starRating .star");
    for (var i = 0; i < stars.length; i++) {
      var checked = (i + 1) === n;
      stars[i].classList.toggle("on", (i + 1) <= n);
      stars[i].setAttribute("aria-checked", checked ? "true" : "false");
      stars[i].setAttribute("tabindex", checked ? "0" : "-1");
    }
    refreshStarLabels();
    if (focusStar) {
      var sel = document.querySelector('#starRating .star[data-val="' + n + '"]');
      if (sel) sel.focus();
    }
  }

  function refreshStarLabels() {
    var stars = document.querySelectorAll("#starRating .star");
    for (var i = 0; i < stars.length; i++) {
      stars[i].setAttribute("aria-label", t("form.star.label", { n: i + 1 }));
    }
  }

  function updateSpotPlaceholder() {
    var spot = document.getElementById("f-spot");
    if (!spot) return;
    var region = (overlay && overlay.querySelector('input[name="region"]:checked'));
    var key = region && region.value === "nl" ? "form.spot.ph.nl" : "form.spot.ph.us";
    spot.setAttribute("placeholder", t(key));
  }

  function syncServiceReadout() {
    if (!overlay) return;
    var svc = SERVICES[state.service] || SERVICES.walk;
    setTextSel(".svc-emoji", svc.emoji);
    setTextSel(".svc-name", t(svc.nameKey));
    setTextSel(".svc-desc", t(svc.descKey));
    setTextSel(".svc-price", t(svc.priceKey));
    setTextSel(".svc-unit", t(svc.unitKey));
    var head = overlay.querySelector("#serviceHead");
    if (head) {
      head.classList.remove("is-walk", "is-pup", "is-rent");
      head.classList.add(svc.variant);
    }
  }

  function setTextSel(sel, text) {
    var el = overlay.querySelector(sel);
    if (el) el.textContent = text;
  }

  function getFocusable() {
    var sel = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(modal.querySelectorAll(sel), function (el) {
      return el.offsetParent !== null; // visible (hidden views excluded)
    });
  }

  function onKeydown(e) {
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key === "Tab") {
      var f = getFocusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function openModal(service, trigger) {
    if (!overlay) return;
    state.service = SERVICES[service] ? service : "walk";
    state.lastTrigger = trigger || document.activeElement;

    // reset to a clean form
    form.reset();
    clearAllErrors();
    setDefault('input[name="size"][value="medium"]');
    setDefault('input[name="region"][value="us"]');
    syncRadioCards();
    setRating(5);
    updateSpotPlaceholder();
    syncServiceReadout();

    var summary = document.getElementById("formErrorSummary");
    if (summary) summary.textContent = "";

    overlay.setAttribute("aria-labelledby", "bookModalTitle");
    confirmView.setAttribute("hidden", "");
    formView.removeAttribute("hidden");

    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setBackgroundInert(true);
    document.addEventListener("keydown", onKeydown);

    var first = document.getElementById("f-dogName");
    setTimeout(function () { if (first) first.focus(); }, 60);

    toast(t("toast.opened"));
  }

  function setDefault(selector) {
    var el = overlay.querySelector(selector);
    if (el) el.checked = true;
  }

  // Mirror native radio "checked" onto the parent card (fallback for :has()).
  function syncRadioCards() {
    if (!overlay) return;
    var radios = overlay.querySelectorAll('.radio-card input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      var c = radios[i].closest(".radio-card");
      if (c) c.classList.toggle("is-checked", radios[i].checked);
    }
  }

  // Hide the rest of the page from AT / focus while the modal is open.
  function setBackgroundInert(on) {
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el === overlay) continue;
      if (el.classList && el.classList.contains("toast-wrap")) continue; // keep toasts announcing
      if (on) {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      } else {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
    }
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    setBackgroundInert(false); // must run before restoring focus to a background element
    document.removeEventListener("keydown", onKeydown);
    if (state.lastTrigger && typeof state.lastTrigger.focus === "function") {
      state.lastTrigger.focus();
    }
  }

  /* ----- validation ----- */
  var REQUIRED = [
    { id: "f-dogName", labelKey: "form.dogName" },
    { id: "f-date", labelKey: "form.date" },
    { id: "f-time", labelKey: "form.time" },
    { id: "f-spot", labelKey: "form.spot" }
  ];

  function showError(input) {
    input.classList.add("invalid");
    // retrigger shake
    input.classList.remove("invalid");
    void input.offsetWidth;
    input.classList.add("invalid");
    var msg = document.getElementById("err-" + input.name);
    if (msg) msg.classList.add("show");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    if (!input || !input.classList) return;
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    var msg = document.getElementById("err-" + input.name);
    if (msg) msg.classList.remove("show");
  }

  function clearAllErrors() {
    var msgs = overlay.querySelectorAll(".error-msg");
    for (var i = 0; i < msgs.length; i++) msgs[i].classList.remove("show");
    var inv = overlay.querySelectorAll(".invalid");
    for (var j = 0; j < inv.length; j++) inv[j].classList.remove("invalid");
  }

  function onSubmit(e) {
    e.preventDefault();
    var firstInvalid = null;
    var invalidLabels = [];
    for (var i = 0; i < REQUIRED.length; i++) {
      var input = document.getElementById(REQUIRED[i].id);
      if (!input.value.trim()) {
        showError(input);
        invalidLabels.push(t(REQUIRED[i].labelKey));
        if (!firstInvalid) firstInvalid = input;
      } else {
        clearError(input);
      }
    }
    // optional email: validate format only when something was entered
    var emailInput = document.getElementById("f-email");
    if (emailInput && emailInput.value.trim() && !isEmail(emailInput.value.trim())) {
      showError(emailInput);
      invalidLabels.push(t("form.email"));
      if (!firstInvalid) firstInvalid = emailInput;
    } else if (emailInput) {
      clearError(emailInput);
    }
    var summary = document.getElementById("formErrorSummary");
    if (firstInvalid) {
      if (summary) summary.textContent = t("toast.fix") + " (" + invalidLabels.join(", ") + ")";
      firstInvalid.focus();
      toast(t("toast.fix"));
      return;
    }
    if (summary) summary.textContent = "";
    completeBooking();
  }

  var SEND_ENDPOINT = "send.php";
  var BOOKING_EMAIL = "info@wintrip.nl";

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function completeBooking() {
    var svc = SERVICES[state.service] || SERVICES.walk;
    var data = {
      service: state.service,
      serviceName: t(svc.nameKey),
      price: t(svc.priceKey) + " " + t(svc.unitKey),
      dogName: val("f-dogName"),
      breed: val("f-breed"),
      email: val("f-email"),
      size: checked("size"),
      sizeLabel: t("form.size." + checked("size")),
      region: checked("region"),
      regionLabel: t("form.region." + checked("region")),
      date: val("f-date"),
      time: val("f-time"),
      spot: val("f-spot"),
      requests: val("f-requests"),
      rating: state.rating,
      lang: state.lang
    };
    state.lastBooking = data;
    persistBooking(data);
    showConfirmation();
    sendBooking(data);
  }

  function showConfirmation() {
    renderReceipt(state.lastBooking);
    formView.setAttribute("hidden", "");
    overlay.setAttribute("aria-labelledby", "bookConfirmTitle"); // keep dialog name in sync with the view
    confirmView.removeAttribute("hidden");
    if (modal) modal.scrollTop = 0;

    toast(t("toast.booked"), "success");

    // Move focus to the confirmation heading so the success is announced.
    var heading = document.getElementById("bookConfirmTitle");
    setTimeout(function () { if (heading) heading.focus(); }, 60);
  }

  // Send the booking to the business inbox via send.php; fall back to a
  // pre-filled mailto if the server call fails (offline, PHP disabled, etc.)
  // so a booking is never silently lost.
  function sendBooking(data) {
    if (!window.fetch) { openMailtoFallback(data); return; }
    fetch(SEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error("status " + res.status);
      return res.text();
    }).then(function (txt) {
      // Pull the JSON object out of the body even if it's wrapped in a BOM, a
      // PHP notice, or stray whitespace (common on shared hosting) — that still
      // counts as delivered, so we must NOT fire a duplicate mailto. But if no
      // real {"ok":true} is present (PHP not executing, error page, raw source),
      // the mail was NOT sent, so fall back to mailto.
      var delivered = false;
      var s = txt.indexOf("{"), e = txt.lastIndexOf("}");
      if (s !== -1 && e > s) {
        try {
          var json = JSON.parse(txt.slice(s, e + 1));
          delivered = !!(json && json.ok);
        } catch (err) { /* not valid JSON → not delivered */ }
      }
      if (!delivered) throw new Error("not delivered");
      // delivered — the confirmation screen is already shown
    }).catch(function () {
      toast(t("toast.sendfail"));
      openMailtoFallback(data);
    });
  }

  function openMailtoFallback(d) {
    var subject = "Doggy Date – " + (d.dogName || "");
    var body = [
      t("confirm.service") + ": " + d.serviceName + " (" + d.price + ")",
      t("confirm.pup") + ": " + (d.dogName || "") + (d.breed ? " · " + d.breed : ""),
      t("form.size") + ": " + (d.sizeLabel || d.size),
      t("confirm.where") + ": " + (d.regionLabel || d.region) + " · " + d.spot,
      t("confirm.when") + ": " + d.date + " " + d.time,
      t("confirm.rating") + ": " + d.rating + "/5",
      (d.email ? t("form.email") + ": " + d.email : ""),
      "",
      t("form.requests") + ": " + (d.requests || "-")
    ].filter(Boolean).join("\n");
    window.location.href = "mailto:" + BOOKING_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  function renderReceipt(d) {
    var svc = SERVICES[d.service] || SERVICES.walk;
    var name = d.dogName || t("confirm.noname");

    setText("confirmMsg", t(d.email ? "confirm.msg.email" : "confirm.msg", { name: name, email: d.email }));
    setText("rcpService", svc.emoji + " " + t(svc.nameKey));

    var pup = name + (d.breed ? " · " + d.breed : "");
    setText("rcpPup", pup);

    var flag = d.region === "nl" ? "🇳🇱" : "🇺🇸";
    var regionName = t(d.region === "nl" ? "form.region.nl" : "form.region.us");
    setText("rcpWhere", flag + " " + regionName + (d.spot ? " · " + d.spot : ""));

    setText("rcpWhen", t("confirm.when.join", { date: formatDate(d.date), time: d.time || "" }));
    setText("rcpRating", repeat("⭐", d.rating));
    setText("rcpTotal", t(svc.priceKey) + " " + t(svc.unitKey));
  }

  function formatDate(value) {
    if (!value) return "";
    var parts = value.split("-");
    if (parts.length !== 3) return value;
    try {
      var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      var locale = state.lang === "nl" ? "nl-NL" : "en-US";
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(dt);
    } catch (e) {
      return value;
    }
  }

  function persistBooking(data) {
    try {
      var list = JSON.parse(localStorage.getItem(BOOK_KEY) || "[]");
      list.push(data);
      localStorage.setItem(BOOK_KEY, JSON.stringify(list));
    } catch (e) { /* storage may be unavailable; non-critical */ }
  }

  /* ----- small helpers ----- */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function checked(name) { var el = overlay.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function repeat(s, n) { var out = ""; for (var i = 0; i < n; i++) out += s; return out; }

  /* book buttons (event delegation; works for injected + static elements) */
  function initBookButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-book]");
      if (!btn) return;
      e.preventDefault();
      openModal(btn.getAttribute("data-service") || "walk", btn);
    });
  }

  /* ===================== boot ===================== */
  function init() {
    state.lang = detectLang();
    injectModal();
    ensureToastWrap(); // create the aria-live region up front so the first toast is announced
    initBookButtons();
    initLangToggle();
    initMobileNav();
    setLang(state.lang, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
