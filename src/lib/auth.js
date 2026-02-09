import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase.js";
import { apiRequest } from "./api.js";

export function getAuthUser() {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

export function observeAuthState(callback) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail({ email, password }) {
  const auth = getFirebaseAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail({ name, email, password, country, region }) {
  const auth = getFirebaseAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  if (user) {
    await apiRequest(`/v1.5/account/${encodeURIComponent(user.uid)}/create`, {
      method: "POST",
      body: {
        name,
        email,
        country: country || region,
        region: region || country,
      },
    });
  }
  return user;
}

export async function signOut() {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}
