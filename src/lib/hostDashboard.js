import { apiRequest } from "./api.js";

const HOST_SESSION_KEY = "boxtobox_host_session";

function readSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
}

export function getStoredHostSession() {
  const storage = readSessionStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(HOST_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw);
    if (!session?.token) {
      return null;
    }
    if (session.refresh_expires_at && new Date(session.refresh_expires_at).getTime() <= Date.now()) {
      clearStoredHostSession();
      return null;
    }
    return session;
  } catch (error) {
    return null;
  }
}

export function setStoredHostSession(session) {
  const storage = readSessionStorage();
  if (!storage) {
    return;
  }
  storage.setItem(HOST_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredHostSession() {
  const storage = readSessionStorage();
  if (storage) {
    storage.removeItem(HOST_SESSION_KEY);
  }
}

export async function requestHostAuthCode() {
  return await apiRequest("/v2.7/host/auth/code", {
    method: "POST",
  });
}

export async function verifyHostAuthCode({ codeId, code }) {
  const result = await apiRequest("/v2.7/host/auth/verify", {
    method: "POST",
    body: {
      code_id: codeId,
      code,
    },
  });
  const session = {
    token: result.host_session_token,
    refreshToken: result.host_refresh_token,
    expires_at: result.expires_at,
    refresh_expires_at: result.refresh_expires_at,
    host: result.host,
  };
  setStoredHostSession(session);
  return session;
}

function shouldRefreshSession(session) {
  if (!session?.refreshToken) {
    return false;
  }
  if (!session?.token || !session?.expires_at) {
    return true;
  }
  return new Date(session.expires_at).getTime() <= Date.now();
}

export async function refreshHostSession(session = getStoredHostSession()) {
  if (!session?.refreshToken) {
    const err = new Error("Host refresh token required.");
    err.code = "HOST_REFRESH_REQUIRED";
    throw err;
  }
  const result = await apiRequest("/v2.7/host/auth/refresh", {
    method: "POST",
    body: {
      host_refresh_token: session.refreshToken,
    },
  });
  const nextSession = {
    token: result.host_session_token,
    refreshToken: result.host_refresh_token,
    expires_at: result.expires_at,
    refresh_expires_at: result.refresh_expires_at,
    host: result.host,
  };
  setStoredHostSession(nextSession);
  return nextSession;
}

export async function fetchHostDashboard(session = getStoredHostSession()) {
  let activeSession = session;
  if (shouldRefreshSession(activeSession)) {
    activeSession = await refreshHostSession(activeSession);
  }
  if (!activeSession?.token) {
    const err = new Error("Host authentication required.");
    err.code = "HOST_AUTH_REQUIRED";
    throw err;
  }
  try {
    return await apiRequest("/v2.7/host/dashboard", {
      headers: {
        "x-host-session-token": activeSession.token,
      },
    });
  } catch (err) {
    if (err?.status === 401 && activeSession?.refreshToken) {
      const refreshed = await refreshHostSession(activeSession);
      return await apiRequest("/v2.7/host/dashboard", {
        headers: {
          "x-host-session-token": refreshed.token,
        },
      });
    }
    throw err;
  }
}
