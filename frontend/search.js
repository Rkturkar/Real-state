/**
 * search.js — manages the search input in the filters bar.
 * Calls back into App whenever the query changes (debounced).
 */
const SearchModule = (() => {
  let _onChange = null;
  let _inputEl  = null;
  let _clearEl  = null;

  const notifyChange = Utils.debounce(() => {
    if (_onChange) _onChange(_inputEl?.value.trim() ?? "");
  }, CONFIG.SEARCH_DEBOUNCE_MS);

  const updateClearVisibility = () => {
    if (_clearEl)
      _clearEl.style.display = _inputEl?.value ? "flex" : "none";
  };

  /* ── Public ──────────────────────────────────────────────────────── */

  /**
   * Initialise the module.
   * @param {Function} onChange  Called with the current query string.
   */
  const init = (onChange) => {
    _onChange = onChange;
    _inputEl  = document.getElementById("search-input");
    _clearEl  = document.getElementById("search-clear");

    if (!_inputEl) return;

    _inputEl.addEventListener("input", () => {
      updateClearVisibility();
      notifyChange();
    });

    _inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clear();
    });

    _clearEl?.addEventListener("click", clear);

    // Hero search bar (optional — present only on index.html)
    const heroInput = document.getElementById("hero-search-input");
    const heroBtn   = document.getElementById("hero-search-btn");

    heroBtn?.addEventListener("click", () => {
      const q = heroInput?.value.trim() ?? "";
      if (_inputEl) _inputEl.value = q;
      updateClearVisibility();
      document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
      if (_onChange) _onChange(q);
    });

    heroInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") heroBtn?.click();
    });
  };

  const getValue = () => _inputEl?.value.trim() ?? "";

  const clear = () => {
    if (_inputEl) _inputEl.value = "";
    updateClearVisibility();
    if (_onChange) _onChange("");
  };

  return { init, getValue, clear };
})();