/**
 * API client for the DataDetective backend.
 *
 * The token is held in sessionStorage, not localStorage. That is a deliberate
 * middle position:
 *
 *   localStorage    survives everything, including a closed browser — the
 *                   longest-lived target for an injected script
 *   memory only     safest, but a refresh drops you out mid-conversation,
 *                   which makes a chat thread feel lost even though the
 *                   server still has it
 *   sessionStorage  survives a refresh, and dies with the tab
 *
 * A conversation is the one thing a person expects to still be there after a
 * reload, so the session has to outlive the page. It still ends when the tab
 * closes, and the server validates the token on every request regardless.
 */

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// In development the Vite proxy forwards /api to localhost:8000, so an empty
// BASE is correct. In a production build there is no proxy: an empty BASE means
// every request goes to the site hosting the frontend, which has no API. Say so
// at build time rather than leaving someone to debug 404s.
if (import.meta.env.PROD && !BASE) {
  console.error(
    "VITE_API_URL is not set. This build will send API requests to itself and " +
      "every one of them will fail. Set VITE_API_URL to the deployed backend " +
      "address and redeploy.",
  );
}
const STORAGE_KEY = "dd-session";

let token = sessionStorage.getItem(STORAGE_KEY) || null;
let onUnauthorized = () => {};

export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem(STORAGE_KEY, value);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return token;
}

export function onSignedOut(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, form, signal } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: form ? form : body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(
      "Can't reach the API. Check that the backend is running on port 8000.",
      0,
    );
  }

  if (response.status === 401) {
    setToken(null);
    onUnauthorized();
    throw new ApiError("Your session ended. Sign in again.", 401);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail;
    throw new ApiError(
      typeof detail === "string" ? detail : response.statusText,
      response.status,
    );
  }
  return payload;
}

export const api = {
  // --- auth -------------------------------------------------------- //
  register: (payload) =>
    request("/api/auth/register", { method: "POST", body: payload }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me"),
  info: () => request("/api"),

  // --- sources and datasets ---------------------------------------- //
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/sources/upload", { method: "POST", form });
  },
  ingestSql: (payload) =>
    request("/api/sources/sql", { method: "POST", body: payload }),
  ingestUrl: (payload) =>
    request("/api/sources/url", { method: "POST", body: payload }),
  sources: () => request("/api/sources"),

  datasets: () => request("/api/datasets"),
  dataset: (id) => request(`/api/datasets/${id}`),
  preview: (id, rows = 25) =>
    request(`/api/datasets/${id}/preview?rows=${rows}`),
  profile: (id, refresh = false) =>
    request(`/api/datasets/${id}/profile${refresh ? "?refresh=true" : ""}`),
  health: (id) => request(`/api/datasets/${id}/health`),
  columns: (id) => request(`/api/datasets/${id}/columns`),
  setSensitive: (id, column, sensitive) =>
    request(`/api/datasets/${id}/columns/${encodeURIComponent(column)}`, {
      method: "PATCH",
      body: { sensitive },
    }),
  drift: (id) => request(`/api/datasets/${id}/drift`),

  cleaningPlan: (id) => request(`/api/datasets/${id}/cleaning-plan`),
  applyCleaning: (id, approvedOpIds) =>
    request(`/api/datasets/${id}/cleaning-plan/apply`, {
      method: "POST",
      body: { approved_op_ids: approvedOpIds },
    }),

  // --- analysis ---------------------------------------------------- //
  analyze: (id, operation, params) =>
    request(`/api/datasets/${id}/analyze`, {
      method: "POST",
      body: { operation, params },
    }),
  querySql: (id, query) =>
    request(`/api/datasets/${id}/query-sql`, { method: "POST", body: { query } }),
  chart: (id, spec) =>
    request(`/api/datasets/${id}/chart`, { method: "POST", body: { spec } }),
  /**
   * Charts are behind the same authentication as everything else, and an
   * <img src> cannot carry a bearer token. Fetching the bytes and handing back
   * an object URL keeps the endpoint protected rather than opening it up for
   * the sake of one tag.
   */
  chartBlob: async (chartId) => {
    const response = await fetch(`${BASE}/api/charts/${chartId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError("Chart could not be loaded", response.status);
    return URL.createObjectURL(await response.blob());
  },
  forecast: (id, payload) =>
    request(`/api/datasets/${id}/forecast`, { method: "POST", body: payload }),

  // --- investigations ---------------------------------------------- //
  investigations: () => request("/api/investigations"),
  investigation: (id) => request(`/api/investigations/${id}`),
  startInvestigation: (payload) =>
    request("/api/investigations", { method: "POST", body: payload }),
  resume: (id, requestId, response) =>
    request(`/api/investigations/${id}/resume`, {
      method: "POST",
      body: { request_id: requestId, response },
    }),
  supplyEvidence: (id, requestId, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/investigations/${id}/evidence/${requestId}/supply`, {
      method: "POST",
      form,
    });
  },
  abandon: (id) =>
    request(`/api/investigations/${id}/abandon`, { method: "POST" }),
  report: (id) => request(`/api/investigations/${id}/report`),
  comparison: (id) => request(`/api/investigations/${id}/comparison`),
  timeline: (id) => request(`/api/investigations/${id}/timeline`),
  evidence: (id) => request(`/api/investigations/${id}/evidence`),
  recommendations: (id) => request(`/api/investigations/${id}/recommendations`),
  requests: (id) => request(`/api/investigations/${id}/requests`),
  sendFeedback: (investigationId, recId, rating, notes) =>
    request(
      `/api/investigations/${investigationId}/recommendations/${recId}/feedback`,
      { method: "POST", body: { rating, notes } },
    ),

  // --- chat -------------------------------------------------------- //
  conversations: () => request("/api/chat/conversations"),
  conversation: (id) => request(`/api/chat/conversations/${id}`),
  // Opens a thread already attached to a finished investigation, for someone
  // who was handed the report rather than running it.
  chatAboutInvestigation: (investigationId) =>
    request("/api/chat/conversations", {
      method: "POST",
      body: { investigation_id: investigationId },
    }),
  newConversation: (payload = {}) =>
    request("/api/chat/conversations", { method: "POST", body: payload }),
  sendMessage: (id, content) =>
    request(`/api/chat/conversations/${id}/messages`, {
      method: "POST",
      body: { content },
    }),
  chatUpload: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/chat/conversations/${id}/upload`, { method: "POST", form });
  },
  archiveConversation: (id) =>
    request(`/api/chat/conversations/${id}`, { method: "DELETE" }),

  // --- knowledge --------------------------------------------------- //
  documents: () => request("/api/documents"),
  deleteDocument: (id) => request(`/api/documents/${id}`, { method: "DELETE" }),
  indexDocument: (payload) =>
    request("/api/documents", { method: "POST", body: payload }),
  search: (query, documentType) =>
    request("/api/search", {
      method: "POST",
      body: { query, top_k: 8, document_type: documentType || null },
    }),
  definition: (term) => request(`/api/definitions/${encodeURIComponent(term)}`),

  // --- tools ------------------------------------------------------- //
  tools: () => request("/api/tools"),
  verifyRun: (runId) => request(`/api/tool-runs/${runId}/verify`),
};