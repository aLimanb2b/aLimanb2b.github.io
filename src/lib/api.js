import { getFirebaseAuth } from "./firebase.js";

export const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";

function buildQueryString(params) {
  if (!params) {
    return "";
  }
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);
  if (pairs.length === 0) {
    return "";
  }
  const searchParams = new URLSearchParams(pairs);
  return `?${searchParams.toString()}`;
}

async function getIdToken() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return await user.getIdToken();
}

export async function apiRequest(path, { method = "GET", query, body, authRequired = true } = {}) {
  const url = `${API_BASE}${path}${buildQueryString(query)}`;
  const headers = {
    "Content-Type": "application/json",
  };

  if (authRequired) {
    const token = await getIdToken();
    if (!token) {
      const err = new Error("Authentication required. Please sign in.");
      err.code = "AUTH_REQUIRED";
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload.message
      ? payload.message
      : `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}
