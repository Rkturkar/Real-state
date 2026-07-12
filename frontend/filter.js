/**
 * filter.js — manages the property-type, price, bedrooms, and city dropdowns.
 */
const FilterModule = (() => {
  let _onChange = null;

  const FILTER_IDS = ["filter-type", "filter-price", "filter-bedrooms", "filter-city"];

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const getFilters = () => ({
    property_type: document.getElementById("filter-type")?.value  ?? "",
    price_range:   document.getElementById("filter-price")?.value ?? "",
    bedrooms:      document.getElementById("filter-bedrooms")?.value ?? "",
    city:          document.getElementById("filter-city")?.value  ?? "",
  });

  const hasActiveFilter = () =>
    Object.values(getFilters()).some((v) => v !== "");

  const updateResetBtn = () => {
    const btn = document.getElementById("filter-reset");
    if (btn) btn.style.display = hasActiveFilter() ? "inline-flex" : "none";
  };

  /* ── Public ──────────────────────────────────────────────────────── */
  const init = (onChange) => {
    _onChange = onChange;

    FILTER_IDS.forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        updateResetBtn();
        if (_onChange) _onChange(getFilters());
      });
    });

    document.getElementById("filter-reset")?.addEventListener("click", reset);
  };

  /** Populate the city <select> from the API (or mock). */
  const populate = async () => {
    const cityEl = document.getElementById("filter-city");
    if (!cityEl) return;

    try {
      const cities = await ApiService.getCities();
      cities.forEach((city) => {
        const opt = document.createElement("option");
        opt.value   = city;
        opt.textContent = city;
        cityEl.appendChild(opt);
      });
    } catch (err) {
      console.warn("Could not populate cities:", err.message);
    }
  };

  const reset = () => {
    FILTER_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    updateResetBtn();
    if (_onChange) _onChange(getFilters());
  };

  return { init, getFilters, populate, reset };
})();