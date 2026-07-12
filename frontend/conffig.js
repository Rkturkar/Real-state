/**
 * config.js — single place for all runtime settings.
 * Change API_BASE_URL to your Render / Railway backend URL before deploying.
 */
const CONFIG = Object.freeze({
  // Point this at your deployed FastAPI backend on Render/Railway.
  // During local dev: http://localhost:8000/api/v1
  API_BASE_URL: "http://localhost:8000/api/v1",

  // Cards shown per page
  ITEMS_PER_PAGE: 9,

  // Milliseconds to wait after the last keystroke before firing a search
  SEARCH_DEBOUNCE_MS: 350,

  // Set true to skip the API entirely and always use the embedded mock data.
  // Useful for GitHub Pages / Netlify deployments without a live backend.
  USE_MOCK_DATA: true,

  // Timeout (ms) before a fetch is automatically aborted
  FETCH_TIMEOUT_MS: 10000,
});