import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

function validateConfig(config) {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    const err = new Error(`Missing Firebase config: ${missing.join(", ")}`);
    err.code = "FIREBASE_CONFIG_MISSING";
    throw err;
  }
}

export function getFirebaseAuth() {
  validateConfig(firebaseConfig);
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}
