/**
 * api.js — every backend call goes through this module.
 * No other file calls fetch() directly.
 *
 * Strategy:
 *   1. If CONFIG.USE_MOCK_DATA is true  → always use embedded mock data (MOCK_PROPERTIES)
 *   2. Otherwise → try the FastAPI backend; on any network error fall back to mock data
 *      so the frontend keeps working even without a running backend.
 */
const ApiService = (() => {
  const { API_BASE_URL, FETCH_TIMEOUT_MS } = CONFIG;

  /* ─── Core fetch with timeout ────────────────────────────────────── */
  const request = async (endpoint) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${res.status}`);
    }
    return res.json();
  };

  /* ─── Client-side helpers (used when API is unavailable) ─────────── */
  const clientSearch = (props, q) => {
    const term = q.toLowerCase();
    return props.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.city.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        (p.project_name || "").toLowerCase().includes(term)
    );
  };

  const clientFilter = (props, f) => {
    let r = [...props];
    if (f.property_type)
      r = r.filter((p) => p.property_type === f.property_type);
    if (f.price_range === "below_50")
      r = r.filter((p) => p.price < 5_000_000);
    else if (f.price_range === "50_to_1cr")
      r = r.filter((p) => p.price >= 5_000_000 && p.price <= 10_000_000);
    else if (f.price_range === "above_1cr")
      r = r.filter((p) => p.price > 10_000_000);
    if (f.bedrooms) {
      if (f.bedrooms === "4+") r = r.filter((p) => p.bedrooms >= 4);
      else r = r.filter((p) => p.bedrooms === parseInt(f.bedrooms, 10));
    }
    if (f.city) r = r.filter((p) => p.city === f.city);
    return r;
  };

  const clientSort = (props, sortBy, order) => {
    const dir = order === "asc" ? 1 : -1;
    return [...props].sort((a, b) => {
      if (sortBy === "price") return dir * (a.price - b.price);
      return dir * (new Date(a.created_at) - new Date(b.created_at));
    });
  };

  /* ─── Wrap an API call with fallback ─────────────────────────────── */
  const withFallback = async (apiFn, fallbackFn) => {
    if (CONFIG.USE_MOCK_DATA) return fallbackFn();
    try {
      return await apiFn();
    } catch (err) {
      console.warn("API unavailable — using mock data:", err.message);
      return fallbackFn();
    }
  };

  /* ─── Public API ─────────────────────────────────────────────────── */
  return {
    /** Fetch all properties, sorted by the given field. */
    getAll: (sortBy = "created_at", order = "desc") =>
      withFallback(
        () => request(`/properties?sort_by=${sortBy}&order=${order}`),
        () => clientSort([...MOCK_PROPERTIES], sortBy, order)
      ),

    /** Fetch a single property by numeric ID. Returns null if not found. */
    getById: (id) =>
      withFallback(
        () => request(`/properties/${id}`),
        () => MOCK_PROPERTIES.find((p) => p.id === id) || null
      ),

    /** Full-text search across title, city, location. */
    search: (q) =>
      withFallback(
        () => request(`/properties/search?q=${encodeURIComponent(q)}`),
        () => clientSearch([...MOCK_PROPERTIES], q)
      ),

    /**
     * Filter + sort in one call.
     * filters: { property_type, price_range, bedrooms, city }
     */
    filter: (filters, sortBy = "created_at", order = "desc") => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries({ ...filters, sort_by: sortBy, order }).filter(
            ([, v]) => v
          )
        )
      );
      return withFallback(
        () => request(`/properties/filter?${params}`),
        () => clientSort(clientFilter([...MOCK_PROPERTIES], filters), sortBy, order)
      );
    },

    /** Distinct city list for the city filter dropdown. */
    getCities: () =>
      withFallback(
        () => request("/properties/cities"),
        () => [...new Set(MOCK_PROPERTIES.map((p) => p.city))].sort()
      ),
  };
})();