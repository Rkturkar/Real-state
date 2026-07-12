/**
 * sort.js — manages the sort dropdown.
 * Translates the select value into { sortBy, order } and notifies App.
 */
const SortModule = (() => {
  let _onChange = null;

  const VALUE_MAP = {
    newest:     { sortBy: "created_at", order: "desc" },
    price_asc:  { sortBy: "price",      order: "asc"  },
    price_desc: { sortBy: "price",      order: "desc" },
  };

  /* ── Public ──────────────────────────────────────────────────────── */
  const init = (onChange) => {
    _onChange = onChange;
    document.getElementById("sort-select")?.addEventListener("change", (e) => {
      if (_onChange) _onChange(getSort(e.target.value));
    });
  };

  const getSort = (val) =>
    VALUE_MAP[val] ?? VALUE_MAP.newest;

  const getValue = () => {
    const el = document.getElementById("sort-select");
    return getSort(el?.value ?? "newest");
  };

  return { init, getSort, getValue };
})();