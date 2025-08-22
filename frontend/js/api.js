
import { API_BASE } from "./config.js";

export function setToken(t){ localStorage.setItem("token", t); }
export function getToken(){ return localStorage.getItem("token"); }
export function clearToken(){ localStorage.removeItem("token"); localStorage.removeItem("user"); }

// Generic fetch helper. By default it sends your JWT if present.
export async function api(path, { method="GET", body, auth=true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = Bearer ${token};

  const res = await fetch(${API_BASE}${path}, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });

  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.message || res.statusText);
  }
  return json?.data ?? json;
}

export function requireAuth(){
  if (!getToken()) location.href = "./login.html";
}
