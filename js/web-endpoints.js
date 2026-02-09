const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const ACCOUNT_STORAGE_KEY = "bb_account_id";
const AUTH_REQUIRED_MESSAGE = "Authentication required. Please sign in.";

let firebaseAuth = null;

function initFirebaseAuth(config) {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth requires a browser environment.");
  }
  if (!window.firebase || !window.firebase.initializeApp) {
    throw new Error("Firebase SDK not loaded. Include firebase-app-compat.js and firebase-auth-compat.js.");
  }
  const firebaseConfig = config || window.FIREBASE_CONFIG;
  if (!firebaseConfig) {
    throw new Error("Missing Firebase config. Set window.FIREBASE_CONFIG before initializing.");
  }
  if (!window.firebase.apps || window.firebase.apps.length === 0) {
    window.firebase.initializeApp(firebaseConfig);
  }
  firebaseAuth = window.firebase.auth();
  return firebaseAuth;
}

function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }
  if (typeof window === "undefined") {
    return null;
  }
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    firebaseAuth = window.firebase.auth();
    return firebaseAuth;
  }
  if (window.firebase && window.FIREBASE_CONFIG) {
    try {
      return initFirebaseAuth(window.FIREBASE_CONFIG);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function requireFirebaseAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not initialized.");
  }
  return auth;
}

function getCurrentUser() {
  const auth = getFirebaseAuth();
  return auth ? auth.currentUser : null;
}

async function getIdToken() {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }
  return await user.getIdToken();
}

async function requireIdToken() {
  const token = await getIdToken();
  if (!token) {
    throw new Error(AUTH_REQUIRED_MESSAGE);
  }
  return token;
}

function resolveAccountId(accountId) {
  if (accountId) {
    return String(accountId);
  }
  const user = getCurrentUser();
  if (user && user.uid) {
    return user.uid;
  }
  const stored = getAccountId();
  if (stored) {
    return stored;
  }
  throw new Error("accountId is required");
}

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

async function request(path, { method = "GET", query, body, headers, authRequired = true } = {}) {
  const url = `${API_BASE}${path}${buildQueryString(query)}`;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  if (authRequired) {
    const token = await requireIdToken();
    init.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, init);
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

function setAccountId(accountId) {
  if (!accountId) {
    throw new Error("accountId is required");
  }
  localStorage.setItem(ACCOUNT_STORAGE_KEY, String(accountId));
}

function getAccountId() {
  return localStorage.getItem(ACCOUNT_STORAGE_KEY);
}

function clearAccountId() {
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

async function signUpWithEmail({ email, password }) {
  const auth = requireFirebaseAuth();
  const result = await auth.createUserWithEmailAndPassword(email, password);
  if (result.user && result.user.uid) {
    setAccountId(result.user.uid);
  }
  return result.user;
}

async function signInWithEmail({ email, password }) {
  const auth = requireFirebaseAuth();
  const result = await auth.signInWithEmailAndPassword(email, password);
  if (result.user && result.user.uid) {
    setAccountId(result.user.uid);
  }
  return result.user;
}

async function signOut() {
  const auth = requireFirebaseAuth();
  await auth.signOut();
  clearAccountId();
}

function onAuthStateChanged(callback) {
  const auth = requireFirebaseAuth();
  return auth.onAuthStateChanged(callback);
}

async function registerAccount({ accountId, name, email, country, region }) {
  const resolvedAccountId = resolveAccountId(accountId);
  const resolvedEmail = email || (getCurrentUser() ? getCurrentUser().email : "");
  return await request(`/v2/account/${encodeURIComponent(resolvedAccountId)}/create`, {
    method: "POST",
    body: {
      name,
      email: resolvedEmail,
      country: country || region,
      region: region || country,
    },
  });
}

async function getAccount({ accountId }) {
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v2/account/${encodeURIComponent(resolvedAccountId)}`);
}

async function loginWithAccountId(accountId) {
  const resolvedAccountId = resolveAccountId(accountId);
  setAccountId(resolvedAccountId);
  return await getAccount({ accountId: resolvedAccountId });
}

async function registerForEvent({ eventId, accountId, register = true }) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v2/event/${encodeURIComponent(eventId)}/register`, {
    method: "POST",
    body: {
      account_id: resolvedAccountId,
      register: Boolean(register),
    },
  });
}

async function unregisterFromEvent({ eventId, accountId }) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v2/event/${encodeURIComponent(eventId)}/unregister`, {
    method: "POST",
    body: {
      account_id: resolvedAccountId,
    },
  });
}

async function getEventAccountState({ eventId, accountId }) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  resolveAccountId(accountId);
  return await request(`/v2/event/${encodeURIComponent(eventId)}/account_states`, {
    query: null,
  });
}

async function sendBankDetailsOtp({
  eventId,
  accountId,
  firstName,
  lastName,
  email,
  phoneNumber,
  accountNumber,
  metadata,
  orderId,
  description,
  channel,
}) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-details/send-otp`, {
    method: "POST",
    body: {
      account_id: resolvedAccountId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
      account_number: accountNumber,
      metadata,
      order_id: orderId,
      description,
      channel,
    },
  });
}

async function validateBankDetailsPayment({
  eventId,
  accountId,
  transactionId,
  otp,
  reference,
  gatewayTransactionId,
}) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-details/validate`, {
    method: "POST",
    body: {
      account_id: resolvedAccountId,
      transaction_id: transactionId,
      otp,
      reference,
      gateway_transaction_id: gatewayTransactionId,
    },
  });
}

async function createBankTransferVirtualAccount({
  eventId,
  accountId,
  firstName,
  lastName,
  email,
  phoneNumber,
  metadata,
  callbackUrl,
  orderId,
  description,
  channel,
}) {
  if (!eventId) {
    throw new Error("eventId is required");
  }
  const resolvedAccountId = resolveAccountId(accountId);
  return await request(`/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-transfer/virtual-account`, {
    method: "POST",
    body: {
      account_id: resolvedAccountId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
      metadata,
      callback_url: callbackUrl,
      order_id: orderId,
      description,
      channel,
    },
  });
}

async function getBankTransferStatus({ eventId, transactionId }) {
  if (!eventId || !transactionId) {
    throw new Error("eventId and transactionId are required");
  }
  resolveAccountId();
  return await request(`/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-transfer/transaction/${encodeURIComponent(transactionId)}`, {
    query: null,
  });
}

async function getPaymentStatus({ eventId, transactionId }) {
  if (!eventId || !transactionId) {
    throw new Error("eventId and transactionId are required");
  }
  resolveAccountId();
  return await request(`/v1.5/event/${encodeURIComponent(eventId)}/payment/${encodeURIComponent(transactionId)}/status`, {
    query: null,
  });
}

const WebEndpoints = {
  initFirebaseAuth,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  onAuthStateChanged,
  getCurrentUser,
  setAccountId,
  getAccountId,
  clearAccountId,
  registerAccount,
  getAccount,
  loginWithAccountId,
  registerForEvent,
  unregisterFromEvent,
  getEventAccountState,
  sendBankDetailsOtp,
  validateBankDetailsPayment,
  createBankTransferVirtualAccount,
  getBankTransferStatus,
  getPaymentStatus,
};

if (typeof window !== "undefined") {
  window.WebEndpoints = WebEndpoints;
}
