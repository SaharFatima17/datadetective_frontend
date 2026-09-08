/**
 * API client for the DataDetective backend.
 *
 * The token lives in memory only. Storing a JWT in localStorage would let any
 * injected script read it; keeping it here means a refresh signs the user out,
 * which is the right trade for a tool that reads private business data.
 */

const BASE = import.meta.env.VITE_API_URL || "";

let token = null;
let onUnauthorized = () => {};

export function setToken(value) {
  token = value;
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
    token = null;
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
  chartUrl: (chartId) => `${BASE}/api/charts/${chartId}`,
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
  timeline: (id) => request(`/api/investigations/${id}/timeline`),
  evidence: (id) => request(`/api/investigations/${id}/evidence`),
  recommendations: (id) => request(`/api/investigations/${id}/recommendations`),
  requests: (id) => request(`/api/investigations/${id}/requests`),
  sendFeedback: (investigationId, recId, rating, notes) =>
    request(
      `/api/investigations/${investigationId}/recommendations/${recId}/feedback`,
      { method: "POST", body: { rating, notes } },
    ),

  // --- knowledge --------------------------------------------------- //
  documents: () => request("/api/documents"),
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
