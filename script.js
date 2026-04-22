/* Mila’s Eden — lightweight interactions (multi-page safe) */

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function getCurrentPageName() {
  // Works for both file:// and http(s)://
  const url = new URL(window.location.href);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "index.html";
  return last.toLowerCase();
}

function setActiveNavLink() {
  const current = getCurrentPageName();
  qsa(".nav-link").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("is-active", href === current);
  });
}

function setFooterYear() {
  const y = qs("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function initMobileNav() {
  const nav = qs(".nav");
  const toggle = qs(".nav-toggle");
  const menu = qs("#navMenu");
  if (!nav || !toggle || !menu) return;

  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  qsa("a", menu).forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function initRevealOnScroll() {
  const els = qsa(".reveal");
  if (!els.length) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });

  els.forEach((el) => io.observe(el));
}

/* Lightbox (Gallery page + any [data-lightbox]) */
function initLightbox() {
  const items = qsa("[data-lightbox='true']");
  if (!items.length) return;

  let overlay = null;
  let overlayImg = null;
  let overlayCap = null;
  let activeIndex = -1;

  const open = (index) => {
    activeIndex = index;
    const item = items[index];
    const src = item.getAttribute("data-src") || qs("img", item)?.getAttribute("src") || "";
    const caption = item.getAttribute("data-caption") || qs("[data-caption]", item)?.textContent || item.getAttribute("aria-label") || "";

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "lightbox";
      overlay.innerHTML = `
        <div class="lightbox-inner" role="dialog" aria-modal="true" aria-label="Image preview">
          <button class="lightbox-close" type="button" aria-label="Close">×</button>
          <button class="lightbox-prev" type="button" aria-label="Previous">‹</button>
          <figure class="lightbox-figure">
            <img class="lightbox-img" alt="" />
            <figcaption class="lightbox-cap"></figcaption>
          </figure>
          <button class="lightbox-next" type="button" aria-label="Next">›</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlayImg = qs(".lightbox-img", overlay);
      overlayCap = qs(".lightbox-cap", overlay);

      qs(".lightbox-close", overlay)?.addEventListener("click", close);
      qs(".lightbox-prev", overlay)?.addEventListener("click", () => step(-1));
      qs(".lightbox-next", overlay)?.addEventListener("click", () => step(1));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      document.addEventListener("keydown", (e) => {
        if (!overlay) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      });
    }

    overlay.style.display = "grid";
    document.documentElement.style.overflow = "hidden";
    if (overlayImg) overlayImg.src = src;
    if (overlayCap) overlayCap.textContent = caption;
  };

  const close = () => {
    if (!overlay) return;
    overlay.style.display = "none";
    document.documentElement.style.overflow = "";
  };

  const step = (dir) => {
    if (!items.length) return;
    const next = (activeIndex + dir + items.length) % items.length;
    open(next);
  };

  items.forEach((item, index) => {
    item.addEventListener("click", () => open(index));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(index); }
    });
  });
}

/* Gallery filtering (Gallery page) */
function initGalleryFilters() {
  const bar = qs("[data-gallery-filters]");
  const grid = qs("[data-gallery-grid]");
  if (!bar || !grid) return;

  const chips = qsa("[data-filter]", bar);
  const items = qsa("[data-category]", grid);
  if (!chips.length || !items.length) return;

  const setActiveChip = (chip) => {
    chips.forEach((c) => c.classList.toggle("is-active", c === chip));
  };

  const apply = (value) => {
    items.forEach((it) => {
      const cat = (it.getAttribute("data-category") || "").toLowerCase();
      const show = value === "all" || cat === value;
      it.style.display = show ? "" : "none";
    });
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const value = (chip.getAttribute("data-filter") || "all").toLowerCase();
      setActiveChip(chip);
      apply(value);
    });
  });
}

/* Booking calendar widget (Booking page) */
function initBookingCalendar() {
  const host = qs("#availabilityCalendar");
  const checkIn = qs("#checkIn");
  const checkOut = qs("#checkOut");
  if (!host || !checkIn || !checkOut) return;

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  // Placeholder: mark some dates "busy" (replace with real availability data later)
  const busy = new Set([
    toISO(y, m, 6),
    toISO(y, m, 12),
    toISO(y, m, 19),
    toISO(y, m, 26),
  ]);

  checkIn.min = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  checkIn.addEventListener("change", () => {
    if (!checkIn.value) return;
    const d = new Date(checkIn.value);
    d.setDate(d.getDate() + 1);
    checkOut.min = d.toISOString().slice(0, 10);
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = "";
  });

  let rangeStart = null;
  let rangeEnd = null;

  renderMonth(y, m);

  function toISO(yy, mm, dd) {
    const d = new Date(yy, mm, dd);
    return d.toISOString().slice(0, 10);
  }

  function daysInMonth(yy, mm) {
    return new Date(yy, mm + 1, 0).getDate();
  }

  function renderMonth(yy, mm) {
    const first = new Date(yy, mm, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    const total = daysInMonth(yy, mm);

    const monthName = first.toLocaleString(undefined, { month: "long", year: "numeric" });
    host.innerHTML = `
      <div class="cal-head">
        <div class="cal-title">${monthName}</div>
        <div class="cal-legend">
          <span class="cal-dot cal-dot-available"></span> Available
          <span class="cal-dot cal-dot-busy"></span> Busy
          <span class="cal-dot cal-dot-selected"></span> Selected
        </div>
      </div>
      <div class="cal-grid" role="grid" aria-label="Availability calendar"></div>
      <p class="cal-note muted">Note: This is a demo availability view. Replace with live availability from your booking system.</p>
    `;

    const grid = qs(".cal-grid", host);
    if (!grid) return;

    const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    weekdays.forEach((d) => {
      const el = document.createElement("div");
      el.className = "cal-dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell is-empty";
      grid.appendChild(blank);
    }

    for (let day = 1; day <= total; day++) {
      const iso = toISO(yy, mm, day);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.textContent = String(day);
      cell.setAttribute("data-date", iso);

      const isPast = iso < checkIn.min;
      const isBusy = busy.has(iso);
      if (isPast || isBusy) {
        cell.disabled = true;
        cell.classList.add(isBusy ? "is-busy" : "is-past");
      }

      cell.addEventListener("click", () => onPick(iso));
      grid.appendChild(cell);
    }

    syncSelectionUI();
  }

  function onPick(iso) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      rangeStart = iso;
      rangeEnd = null;
    } else if (iso <= rangeStart) {
      rangeStart = iso;
      rangeEnd = null;
    } else {
      rangeEnd = iso;
    }

    checkIn.value = rangeStart || "";
    checkOut.value = rangeEnd || "";
    if (checkIn.value) checkIn.dispatchEvent(new Event("change"));
    syncSelectionUI();
  }

  function syncSelectionUI() {
    const cells = qsa(".cal-cell[data-date]", host);
    cells.forEach((c) => {
      const d = c.getAttribute("data-date");
      c.classList.remove("is-selected", "is-inrange");
      if (!d) return;
      if (rangeStart && d === rangeStart) c.classList.add("is-selected");
      if (rangeEnd && d === rangeEnd) c.classList.add("is-selected");
      if (rangeStart && rangeEnd && d > rangeStart && d < rangeEnd) c.classList.add("is-inrange");
    });
  }
}

/* Lightweight modal confirmations (Booking + Contact) */
function openModal(title, bodyHtml) {
  const overlay = document.createElement("div");
  overlay.className = "modal";
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-top">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="modal-x" type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-actions">
        <button class="btn btn-soft modal-close" type="button">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.documentElement.style.overflow = "hidden";

  const close = () => {
    overlay.remove();
    document.documentElement.style.overflow = "";
  };
  qs(".modal-x", overlay)?.addEventListener("click", close);
  qs(".modal-close", overlay)?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onEsc);
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

function initForms() {
  const bookingForm = qs("#bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const checkIn = data.get("checkIn");
      const checkOut = data.get("checkOut");
      if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
        openModal("Check your dates", `<p class="muted">Check-out must be after check-in.</p>`);
        return;
      }

      openModal("Booking request received", `
        <p><strong>Thank you — we’ve received your request.</strong></p>
        <p class="muted">We’ll confirm availability and reply with final pricing and payment instructions.</p>
        <div class="modal-summary">
          <div><strong>Name:</strong> ${escapeHtml(data.get("name") || "")}</div>
          <div><strong>Email:</strong> ${escapeHtml(data.get("email") || "")}</div>
          <div><strong>Phone:</strong> ${escapeHtml(data.get("phone") || "")}</div>
          <div><strong>Dates:</strong> ${escapeHtml(checkIn || "")} → ${escapeHtml(checkOut || "")}</div>
          <div><strong>Guests:</strong> ${escapeHtml(data.get("guests") || "")}</div>
          <div><strong>Stay:</strong> ${escapeHtml(data.get("stayType") || "")}</div>
        </div>
      `);

      bookingForm.reset();
    });
  }

  const contactForm = qs("#contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(contactForm);
      openModal("Message sent", `
        <p><strong>Thank you — we’ll get back to you shortly.</strong></p>
        <p class="muted">If your message is urgent, please call <a href="tel:+27639611243">+27 63 961 1243</a> or <a href="tel:+27615016118">+27 61 501 6118</a>.</p>
        <div class="modal-summary">
          <div><strong>Name:</strong> ${escapeHtml(data.get("name") || "")}</div>
          <div><strong>Email:</strong> ${escapeHtml(data.get("email") || "")}</div>
          <div><strong>Subject:</strong> ${escapeHtml(data.get("subject") || "")}</div>
        </div>
      `);
      contactForm.reset();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
  setFooterYear();
  initMobileNav();
  initRevealOnScroll();
  initGalleryFilters();
  initLightbox();
  initBookingCalendar();
  initForms();
});