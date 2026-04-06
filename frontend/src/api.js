/**
 * VITE_API_BASE (env):
 * - Dev: `/api/v1` → proxy Vite → Laravel (ver .env.development)
 * - Produção: URL absoluta, ex. https://gestorgastos.rf.gd/api/v1 (ver .env.production)
 */
function apiBase() {
  const raw = (import.meta.env.VITE_API_BASE ?? "/api/v1").trim();
  return raw.replace(/\/+$/, "") || "/api/v1";
}

const BASE = apiBase();

/** Para mensagens de erro / diagnóstico (ex.: ecrã de falha ao arrancar). */
export function getApiBaseUrl() {
  return BASE;
}

async function fetchJson(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      (data.errors && Object.values(data.errors).flat().join(" ")) ||
      `Erro HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.requestUrl = url;
    throw err;
  }
  return data;
}

export const getCategories = () => fetchJson("/categories");

export const createCategory = (body) =>
  fetchJson("/categories", { method: "POST", body: JSON.stringify(body) });

export const deleteCategory = (id) =>
  fetchJson(`/categories/${id}`, { method: "DELETE" });

export const getPeople = () => fetchJson("/people");

export const createPerson = (body) =>
  fetchJson("/people", { method: "POST", body: JSON.stringify(body) });

export const deletePerson = (id) =>
  fetchJson(`/people/${id}`, { method: "DELETE" });

export const getExpenses = (params = {}) => {
  const q = new URLSearchParams({ per_page: "500", ...params });
  return fetchJson(`/expenses?${q}`);
};

export const createExpense = (body) =>
  fetchJson("/expenses", { method: "POST", body: JSON.stringify(body) });

export const updateExpense = (id, body) =>
  fetchJson(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteExpense = (id) =>
  fetchJson(`/expenses/${id}`, { method: "DELETE" });

export const markExpensePaid = (id) =>
  fetchJson(`/expenses/${id}/pay`, { method: "PATCH" });

export const getDashboard = (month) => {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return fetchJson(`/expenses/dashboard${q}`);
};

export const getAlerts = () => fetchJson("/expenses/alerts");
