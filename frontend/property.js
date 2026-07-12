/**
 * property.js — drives property.html
 * Reads ?id= from the URL, fetches the property, renders all detail sections.
 */
const PropertyPage = (() => {
  /* ─── Carousel ────────────────────────────────────────────────────── */
  let _images = [];
  let _cur    = 0;

  const goTo = (idx) => {
    _cur = (idx + _images.length) % _images.length;
    document.querySelectorAll(".carousel__slide").forEach((s, i) =>
      s.classList.toggle("is-active", i === _cur)
    );
    document.querySelectorAll(".carousel__dot").forEach((d, i) =>
      d.classList.toggle("is-active", i === _cur)
    );
  };

  const initCarousel = (images) => {
    _images = images;
    _cur    = 0;

    const track = document.getElementById("carousel-track");
    const dots  = document.getElementById("carousel-dots");
    if (!track) return;

    track.innerHTML = images
      .map(
        (url, i) => `
        <div class="carousel__slide ${i === 0 ? "is-active" : ""}">
          <img src="${Utils.escapeHtml(url)}"
               alt="Property image ${i + 1}"
               loading="${i === 0 ? "eager" : "lazy"}"
               ${Utils.imgFallback} />
        </div>`
      )
      .join("");

    if (dots) {
      dots.innerHTML = images
        .map(
          (_, i) =>
            `<button class="carousel__dot ${i === 0 ? "is-active" : ""}"
               data-idx="${i}" aria-label="Go to image ${i + 1}"></button>`
        )
        .join("");
      dots.querySelectorAll(".carousel__dot").forEach((d) =>
        d.addEventListener("click", () => goTo(parseInt(d.dataset.idx, 10)))
      );
    }

    document.getElementById("carousel-prev")?.addEventListener("click", () => goTo(_cur - 1));
    document.getElementById("carousel-next")?.addEventListener("click", () => goTo(_cur + 1));

    // Touch swipe support
    let touchStartX = 0;
    track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", (e) => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 50) goTo(_cur + (delta < 0 ? 1 : -1));
    });
  };

  /* ─── Render helpers ─────────────────────────────────────────────── */
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.textContent = val;
  };

  const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  /* ─── Full property render ────────────────────────────────────────── */
  const renderProperty = (p) => {
    document.title = `${p.title} | PropertyBazaar`;

    // Carousel
    initCarousel(p.images?.length ? p.images : [Utils.FALLBACK_IMG]);

    // Header section
    setText("prop-price", Utils.formatPrice(p.price));
    setText("prop-title", p.title);
    setText("prop-location", `${p.location}, ${p.city}`);

    // Badge
    const badge = document.getElementById("prop-type-badge");
    if (badge) {
      badge.textContent = p.property_type;
      badge.className   = `prop-badge ${Utils.badgeClass(p.property_type)}`;
    }

    // Key stats grid
    const isComm = p.property_type === "Commercial";
    setText("stat-area",  `${p.area.toLocaleString()} sqft`);
    setText("stat-bath",  p.bathrooms);
    setText("stat-type",  p.property_type);

    const bedRow = document.getElementById("stat-bed-row");
    if (bedRow) bedRow.style.display = isComm ? "none" : "flex";
    if (!isComm) setText("stat-bed", p.bedrooms);

    // Description
    setText("prop-description", p.description);

    // Amenities
    setHTML(
      "prop-amenities",
      p.amenities
        ?.map(
          (a) =>
            `<span class="amenity-chip">${Utils.ICONS.checkCircle}${Utils.escapeHtml(a)}</span>`
        )
        .join("") || "<p>No amenities listed.</p>"
    );

    // Project details
    setText("prop-builder",    p.builder   || "—");
    setText("prop-rera",       p.rera_number || "—");
    setText("prop-possession", p.possession  || "—");
    setText("prop-project",    p.project_name || "—");

    // Agent
    if (p.agent) {
      setText("agent-name",  p.agent.name);
      setText("agent-phone", p.agent.phone);
      setText("agent-email", p.agent.email);

      const phoneLink = document.getElementById("agent-phone-link");
      if (phoneLink) phoneLink.href = `tel:${p.agent.phone.replace(/\s/g, "")}`;

      const emailLink = document.getElementById("agent-email-link");
      if (emailLink) emailLink.href = `mailto:${p.agent.email}`;
    }

    // Favourite button state
    const favs   = JSON.parse(localStorage.getItem("re_favorites") || "[]");
    const isFav  = favs.includes(p.id);
    const favBtn = document.getElementById("detail-fav-btn");
    if (favBtn) {
      favBtn.classList.toggle("is-fav", isFav);
      favBtn.innerHTML = `${Utils.ICONS.heart(isFav)} ${isFav ? "Saved" : "Save"}`;
      favBtn.addEventListener("click", () => {
        const list = JSON.parse(localStorage.getItem("re_favorites") || "[]");
        const i    = list.indexOf(p.id);
        if (i === -1) {
          list.push(p.id);
          favBtn.classList.add("is-fav");
          favBtn.innerHTML = `${Utils.ICONS.heart(true)} Saved`;
          Utils.showToast("Added to favourites ❤️");
        } else {
          list.splice(i, 1);
          favBtn.classList.remove("is-fav");
          favBtn.innerHTML = `${Utils.ICONS.heart(false)} Save`;
          Utils.showToast("Removed from favourites");
        }
        localStorage.setItem("re_favorites", JSON.stringify(list));
      });
    }
  };

  /* ─── Contact modal ──────────────────────────────────────────────── */
  const initContactModal = () => {
    const modal    = document.getElementById("contact-modal");
    const openBtn  = document.getElementById("contact-agent-btn");
    const closeBtn = document.getElementById("modal-close");
    const form     = document.getElementById("contact-form");

    const open  = () => { modal?.classList.add("is-open"); document.body.style.overflow = "hidden"; };
    const close = () => { modal?.classList.remove("is-open"); document.body.style.overflow = ""; };

    openBtn?.addEventListener("click",  open);
    closeBtn?.addEventListener("click", close);
    modal?.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      close();
      Utils.showToast("Message sent! The agent will contact you shortly. ✅");
      form.reset();
    });
  };

  /* ─── Dark mode (shared with app.js logic) ─────────────────────── */
  const initDarkMode = () => {
    const saved = localStorage.getItem("re_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    const btn = document.getElementById("dark-mode-toggle");
    if (btn) {
      btn.innerHTML = saved === "dark" ? Utils.ICONS.sun : Utils.ICONS.moon;
      btn.addEventListener("click", () => {
        const cur  = document.documentElement.getAttribute("data-theme");
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("re_theme", next);
        btn.innerHTML = next === "dark" ? Utils.ICONS.sun : Utils.ICONS.moon;
      });
    }
  };

  /* ─── Mobile nav ────────────────────────────────────────────────── */
  const initMobileNav = () => {
    const toggle = document.getElementById("menu-toggle");
    const navEl  = document.getElementById("nav-menu");
    toggle?.addEventListener("click", () => navEl?.classList.toggle("is-open"));
  };

  /* ─── Scroll to top ─────────────────────────────────────────────── */
  const initScrollTop = () => {
    const btn = document.getElementById("scroll-top");
    if (!btn) return;
    window.addEventListener("scroll", () => btn.classList.toggle("visible", window.scrollY > 400), { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  /* ─── Loading / error states ────────────────────────────────────── */
  const showDetailSkeleton = () => {
    const cont = document.getElementById("detail-content");
    if (!cont) return;
    cont.innerHTML = `
      <div class="detail-skeleton" aria-hidden="true">
        <div class="skel skel--carousel"></div>
        <div class="skel skel--title mt-xl"></div>
        <div class="skel skel--text mt-md"></div>
        <div class="skel skel--text mt-sm"></div>
      </div>`;
  };

  const showDetailError = (msg) => {
    const cont = document.getElementById("detail-content");
    if (!cont) return;
    cont.innerHTML = `
      <div class="error-state">
        <div class="error-state__icon">🏠</div>
        <h3 class="error-state__title">Property not found</h3>
        <p class="error-state__sub">${Utils.escapeHtml(msg)}</p>
        <a href="index.html" class="btn btn--primary">Back to listings</a>
      </div>`;
  };

  /* ─── Entry point ───────────────────────────────────────────────── */
  const init = async () => {
    initDarkMode();
    initMobileNav();
    initScrollTop();
    initContactModal();

    // Back button — prefer history, fall back to listings
    document.getElementById("back-btn")?.addEventListener("click", () => {
      if (document.referrer) window.history.back();
      else window.location.href = "index.html";
    });

    // Get ID from URL
    const params = new URLSearchParams(window.location.search);
    const id     = parseInt(params.get("id"), 10);

    if (!id || isNaN(id)) {
      window.location.href = "404.html";
      return;
    }

    showDetailSkeleton();

    try {
      const property = await ApiService.getById(id);
      if (!property) { window.location.href = "404.html"; return; }

      // Reveal the real content
      const cont = document.getElementById("detail-content");
      if (cont) cont.innerHTML = ""; // skeleton removed; real markup is in the HTML

      renderProperty(property);
    } catch (err) {
      showDetailError(err.message);
    }
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", PropertyPage.init);