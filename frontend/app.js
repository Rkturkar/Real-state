/**
 * app.js — main page orchestrator.
 *
 * State flow:
 *   User interaction → SearchModule | FilterModule | SortModule
 *        ↓ callback
 *   App.applyAndRender()
 *        ↓ ApiService (or mock fallback)
 *   renderProperties()
 *        ↓
 *   DOM update
 */
const App = (() => {
  /* ── State ─────────────────────────────────────────────────────────── */
  const state = {
    displayedProperties: [],  // current filtered + sorted list
    currentPage: 1,
    isLoading: false,
    search: "",
    filters: {},
    sort: { sortBy: "created_at", order: "desc" },
    favorites: JSON.parse(localStorage.getItem("re_favorites") || "[]"),
  };

  /* ── DOM refs (populated in init) ─────────────────────────────────── */
  const el = {};

  /* ════════════════════════════════════════════════════════════════════
     CARD RENDERING
  ══════════════════════════════════════════════════════════════════════ */
  const buildCard = (prop) => {
    const isFav  = state.favorites.includes(prop.id);
    const img    = prop.images?.[0] ?? Utils.FALLBACK_IMG;
    const isComm = prop.property_type === "Commercial";
    const stats  = isComm
      ? `<span class="prop-stat">${Utils.ICONS.building}<span>Office Space</span></span>`
      : `<span class="prop-stat">${Utils.ICONS.bed}<span>${prop.bedrooms} Bed</span></span>
         <span class="prop-stat">${Utils.ICONS.bath}<span>${prop.bathrooms} Bath</span></span>`;

    return `
      <article class="prop-card" data-id="${prop.id}">
        <div class="prop-card__img-wrap">
          <img
            src="${Utils.escapeHtml(img)}"
            alt="${Utils.escapeHtml(prop.title)}"
            class="prop-card__img"
            loading="lazy"
            ${Utils.imgFallback}
          />
          ${prop.is_featured ? '<span class="prop-card__featured">Featured</span>' : ""}
          <span class="prop-badge ${Utils.badgeClass(prop.property_type)}">
            ${Utils.escapeHtml(prop.property_type)}
          </span>
          <button
            class="prop-card__fav ${isFav ? "is-fav" : ""}"
            data-id="${prop.id}"
            aria-label="${isFav ? "Remove from favourites" : "Add to favourites"}"
            title="${isFav ? "Remove from favourites" : "Add to favourites"}"
          >${Utils.ICONS.heart(isFav)}</button>
        </div>
        <div class="prop-card__body">
          <div class="prop-card__price">${Utils.formatPrice(prop.price)}</div>
          <h3 class="prop-card__title">${Utils.escapeHtml(prop.title)}</h3>
          <p class="prop-card__loc">
            ${Utils.ICONS.pin}
            ${Utils.escapeHtml(prop.location)}, ${Utils.escapeHtml(prop.city)}
          </p>
          <div class="prop-card__stats">
            ${stats}
            <span class="prop-stat">${Utils.ICONS.area}<span>${prop.area.toLocaleString()} sqft</span></span>
          </div>
          <a href="property.html?id=${prop.id}" class="btn btn--primary prop-card__cta">
            View Details ${Utils.ICONS.arrowRight}
          </a>
        </div>
      </article>`;
  };

  /* ── Empty state ──────────────────────────────────────────────────── */
  const buildEmptyState = () => `
    <div class="empty-state">
      <div class="empty-state__icon">🏠</div>
      <h3 class="empty-state__title">No properties found</h3>
      <p class="empty-state__sub">Try adjusting your search or filters.</p>
      <button class="btn btn--outline" id="empty-reset-btn">Clear all filters</button>
    </div>`;

  /* ── Error state ──────────────────────────────────────────────────── */
  const buildErrorState = (msg) => `
    <div class="error-state">
      <div class="error-state__icon">⚠️</div>
      <h3 class="error-state__title">Something went wrong</h3>
      <p class="error-state__sub">${Utils.escapeHtml(msg)}</p>
      <button class="btn btn--primary" id="error-retry-btn">Try again</button>
    </div>`;

  /* ── Pagination ───────────────────────────────────────────────────── */
  const totalPages = () =>
    Math.max(1, Math.ceil(state.displayedProperties.length / CONFIG.ITEMS_PER_PAGE));

  const renderPagination = () => {
    if (!el.pagination) return;
    const tp = totalPages();
    if (tp <= 1) { el.pagination.innerHTML = ""; return; }

    const cur = state.currentPage;
    const mkBtn = (label, page, disabled = false, active = false) => `
      <button
        class="page-btn ${active ? "is-active" : ""}"
        data-page="${page}"
        ${disabled ? "disabled" : ""}
        aria-label="Page ${page}"
        ${active ? 'aria-current="page"' : ""}
      >${label}</button>`;

    let html = mkBtn(Utils.ICONS.chevronLeft, cur - 1, cur === 1);
    for (let i = 1; i <= tp; i++) {
      if (tp <= 7 || Math.abs(i - cur) <= 2 || i === 1 || i === tp) {
        html += mkBtn(i, i, false, i === cur);
      } else if (Math.abs(i - cur) === 3) {
        html += `<span class="page-ellipsis">…</span>`;
      }
    }
    html += mkBtn(Utils.ICONS.chevronRight, cur + 1, cur === tp);
    el.pagination.innerHTML = html;

    el.pagination.querySelectorAll(".page-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentPage = parseInt(btn.dataset.page, 10);
        renderPage();
        el.grid?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  /* ── Render one page of cards ─────────────────────────────────────── */
  const renderPage = () => {
    if (!el.grid) return;
    const { displayedProperties: props, currentPage: cp } = state;

    if (!props.length) {
      el.grid.innerHTML = buildEmptyState();
      el.grid.querySelector("#empty-reset-btn")?.addEventListener("click", resetAll);
      if (el.count) el.count.textContent = "0 properties found";
      if (el.pagination) el.pagination.innerHTML = "";
      return;
    }

    const start = (cp - 1) * CONFIG.ITEMS_PER_PAGE;
    const slice = props.slice(start, start + CONFIG.ITEMS_PER_PAGE);

    el.grid.innerHTML = slice.map(buildCard).join("");
    if (el.count)
      el.count.textContent = `${props.length} ${props.length === 1 ? "property" : "properties"} found`;

    // Favourite button listeners
    el.grid.querySelectorAll(".prop-card__fav").forEach((btn) =>
      btn.addEventListener("click", toggleFavourite)
    );

    renderPagination();
  };

  /* ── Skeletons ────────────────────────────────────────────────────── */
  const renderSkeletons = () => {
    if (el.grid) el.grid.innerHTML = Utils.createSkeletons(CONFIG.ITEMS_PER_PAGE);
    if (el.count) el.count.textContent = "Loading…";
    if (el.pagination) el.pagination.innerHTML = "";
  };

  /* ════════════════════════════════════════════════════════════════════
     CORE: fetch → filter → sort → render
  ══════════════════════════════════════════════════════════════════════ */
  const applyAndRender = async () => {
    if (state.isLoading) return;
    state.isLoading = true;
    state.currentPage = 1;
    renderSkeletons();

    try {
      const { search, filters, sort } = state;
      const hasSearch  = search.length > 0;
      const hasFilters = Object.values(filters).some(Boolean);
      let results;

      if (hasSearch && hasFilters) {
        // Search first (API/mock), then filter client-side for speed
        const searched = await ApiService.search(search);
        results = FilterModule.getFilters
          ? applyClientFilter(searched, filters)
          : searched;
      } else if (hasSearch) {
        results = await ApiService.search(search);
      } else if (hasFilters) {
        results = await ApiService.filter(filters, sort.sortBy, sort.order);
      } else {
        results = await ApiService.getAll(sort.sortBy, sort.order);
      }

      // Always apply sort client-side as a final pass (ensures consistency)
      results = applySortClient(results, sort.sortBy, sort.order);

      state.displayedProperties = results;
      renderPage();
    } catch (err) {
      if (el.grid) {
        el.grid.innerHTML = buildErrorState(err.message);
        el.grid.querySelector("#error-retry-btn")?.addEventListener("click", applyAndRender);
      }
      Utils.showToast(err.message, "error");
    } finally {
      state.isLoading = false;
    }
  };

  /* ── Client-side helpers (fast, no network) ───────────────────────── */
  const applyClientFilter = (props, f) => {
    let r = [...props];
    if (f.property_type) r = r.filter((p) => p.property_type === f.property_type);
    if (f.price_range === "below_50")    r = r.filter((p) => p.price < 5_000_000);
    else if (f.price_range === "50_to_1cr") r = r.filter((p) => p.price >= 5_000_000 && p.price <= 10_000_000);
    else if (f.price_range === "above_1cr") r = r.filter((p) => p.price > 10_000_000);
    if (f.bedrooms === "4+") r = r.filter((p) => p.bedrooms >= 4);
    else if (f.bedrooms)     r = r.filter((p) => p.bedrooms === parseInt(f.bedrooms, 10));
    if (f.city) r = r.filter((p) => p.city === f.city);
    return r;
  };

  const applySortClient = (props, sortBy, order) => {
    const dir = order === "asc" ? 1 : -1;
    return [...props].sort((a, b) => {
      if (sortBy === "price") return dir * (a.price - b.price);
      return dir * (new Date(a.created_at) - new Date(b.created_at));
    });
  };

  /* ════════════════════════════════════════════════════════════════════
     FAVOURITES
  ══════════════════════════════════════════════════════════════════════ */
  const toggleFavourite = (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const id  = parseInt(btn.dataset.id, 10);
    const idx = state.favorites.indexOf(id);

    if (idx === -1) {
      state.favorites.push(id);
      Utils.showToast("Added to favourites ❤️");
    } else {
      state.favorites.splice(idx, 1);
      Utils.showToast("Removed from favourites");
    }
    localStorage.setItem("re_favorites", JSON.stringify(state.favorites));

    // Swap icon in place without re-rendering the whole grid
    const isFav = idx === -1;
    btn.classList.toggle("is-fav", isFav);
    btn.setAttribute("aria-label", isFav ? "Remove from favourites" : "Add to favourites");
    btn.innerHTML = Utils.ICONS.heart(isFav);
  };

  /* ════════════════════════════════════════════════════════════════════
     DARK MODE
  ══════════════════════════════════════════════════════════════════════ */
  const initDarkMode = () => {
    const saved = localStorage.getItem("re_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    updateDarkModeIcon(saved);

    document.getElementById("dark-mode-toggle")?.addEventListener("click", () => {
      const cur  = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("re_theme", next);
      updateDarkModeIcon(next);
    });
  };

  const updateDarkModeIcon = (theme) => {
    const btn = document.getElementById("dark-mode-toggle");
    if (!btn) return;
    btn.innerHTML = theme === "dark" ? Utils.ICONS.sun : Utils.ICONS.moon;
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };

  /* ════════════════════════════════════════════════════════════════════
     SCROLL TO TOP
  ══════════════════════════════════════════════════════════════════════ */
  const initScrollToTop = () => {
    const btn = document.getElementById("scroll-top");
    if (!btn) return;
    const onScroll = () => btn.classList.toggle("visible", window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  /* ════════════════════════════════════════════════════════════════════
     MOBILE NAV
  ══════════════════════════════════════════════════════════════════════ */
  const initMobileNav = () => {
    const toggle = document.getElementById("menu-toggle");
    const navEl  = document.getElementById("nav-menu");
    toggle?.addEventListener("click", () => {
      navEl?.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", navEl?.classList.contains("is-open") ? "true" : "false");
    });
    // Close when a nav link is clicked
    navEl?.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => navEl.classList.remove("is-open"))
    );
  };

  /* ════════════════════════════════════════════════════════════════════
     FEATURED PROPERTIES STRIP (hero section)
  ══════════════════════════════════════════════════════════════════════ */
  const renderFeatured = async () => {
    const strip = document.getElementById("featured-strip");
    if (!strip) return;

    try {
      const all = await ApiService.getAll();
      const featured = all.filter((p) => p.is_featured).slice(0, 3);
      if (!featured.length) { strip.parentElement?.remove(); return; }

      strip.innerHTML = featured.map((p) => `
        <a href="property.html?id=${p.id}" class="feat-card">
          <img src="${Utils.escapeHtml(p.images[0] || Utils.FALLBACK_IMG)}"
               alt="${Utils.escapeHtml(p.title)}"
               loading="lazy" ${Utils.imgFallback} />
          <div class="feat-card__info">
            <span class="feat-card__price">${Utils.formatPrice(p.price)}</span>
            <span class="feat-card__name">${Utils.escapeHtml(p.title)}</span>
            <span class="feat-card__loc">${Utils.ICONS.pin}${Utils.escapeHtml(p.city)}</span>
          </div>
        </a>`).join("");
    } catch {
      strip.parentElement?.remove();
    }
  };

  /* ════════════════════════════════════════════════════════════════════
     RESET ALL
  ══════════════════════════════════════════════════════════════════════ */
  const resetAll = () => {
    SearchModule.clear();
    FilterModule.reset();
    document.getElementById("sort-select").value = "newest";
    state.search  = "";
    state.filters = {};
    state.sort    = { sortBy: "created_at", order: "desc" };
    applyAndRender();
  };

  /* ════════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════════ */
  const init = async () => {
    // Cache DOM references
    el.grid       = document.getElementById("properties-grid");
    el.count      = document.getElementById("properties-count");
    el.pagination = document.getElementById("pagination");

    initDarkMode();
    initScrollToTop();
    initMobileNav();

    // Populate city dropdown
    await FilterModule.populate();

    // Wire up sub-modules
    SearchModule.init((q) => {
      state.search = q;
      applyAndRender();
    });

    FilterModule.init((f) => {
      state.filters = f;
      applyAndRender();
    });

    SortModule.init((s) => {
      state.sort = s;
      applyAndRender();
    });

    // Render featured strip and initial property list in parallel
    await Promise.all([renderFeatured(), applyAndRender()]);
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);