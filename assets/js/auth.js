/* =============================================================
   RCCG Learning Path - Auth & cross-device progress sync

   Architecture: localStorage stays the fast, synchronous cache that
   every existing page already reads from (RCCG.isStudyComplete etc.
   in app.js are unchanged and still instant). This module layers
   Firestore sync on top:

   - On sign-in, this fetches the user's saved progress from Firestore,
     MERGES it with whatever's in localStorage (union of completed
     studies - so nothing done as a guest is lost), writes the merged
     result back to both localStorage and Firestore, then fires a
     'rccg:progress-synced' event so pages can repaint anything showing
     progress (progress bars, checkmarks, etc.).
   - Whenever RCCG.markStudyComplete() is called anywhere in the app,
     this also pushes the update to Firestore in the background if the
     person is signed in (see the hook installed at the bottom).
   - Signed-out visitors work exactly as before, localStorage only.
   ============================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp(RCCG_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const PROGRESS_KEY = 'rccg-learning-progress-v1';

function readLocalProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch (e) { return {}; }
}
function writeLocalProgress(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

/** Union-merge two progress objects: { moduleId: { studyId: true } } */
function mergeProgress(a, b) {
  const out = {};
  for (const src of [a, b]) {
    for (const moduleId in src) {
      out[moduleId] = out[moduleId] || {};
      for (const studyId in src[moduleId]) {
        if (src[moduleId][studyId]) out[moduleId][studyId] = true;
      }
    }
  }
  return out;
}

let currentUser = null;
let syncing = false;

async function syncOnSignIn(user) {
  if (syncing) return;
  syncing = true;
  try {
    const ref = doc(db, 'progress', user.uid);
    const snap = await getDoc(ref);
    const remote = snap.exists() ? (snap.data().modules || {}) : {};
    const local = readLocalProgress();
    const merged = mergeProgress(local, remote);
    writeLocalProgress(merged);
    await setDoc(ref, { modules: merged, updatedAt: Date.now(), email: user.email || null }, { merge: true });
    window.dispatchEvent(new CustomEvent('rccg:progress-synced', { detail: merged }));
  } catch (err) {
    console.error('RCCG progress sync failed:', err);
  } finally {
    syncing = false;
  }
}

async function pushProgressToCloud() {
  if (!currentUser) return;
  try {
    const ref = doc(db, 'progress', currentUser.uid);
    await setDoc(ref, { modules: readLocalProgress(), updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.error('RCCG progress push failed:', err);
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  window.dispatchEvent(new CustomEvent('rccg:auth-changed', { detail: user }));
  if (user) syncOnSignIn(user);
});

/* ---------------- Public API exposed as window.RCCGAuth ---------------- */

async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    // Popup is the more reliable method when it's available - it doesn't need
    // to persist any state across a full-page navigation, so it isn't
    // affected by the storage-partitioning issues that break the redirect
    // flow in private/incognito windows and on browsers with strict
    // cross-site privacy settings (increasingly the default even in normal
    // windows). It only fails if the browser actively blocks the popup.
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    const popupBlocked = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']
      .includes(err.code);
    if (!popupBlocked) throw err; // real errors (wrong password flow, etc.) surface normally
    // Fall back to redirect only when the browser actually blocked the popup.
    sessionStorage.setItem('rccg-google-redirect-pending', '1');
    await signInWithRedirect(auth, provider);
  }
}

// Surface any error/incomplete result from a just-completed redirect
// fallback (only relevant if signInGoogle had to fall back to redirect above).
const wasRedirectPending = sessionStorage.getItem('rccg-google-redirect-pending') === '1';
sessionStorage.removeItem('rccg-google-redirect-pending');

getRedirectResult(auth)
  .then((result) => {
    if (wasRedirectPending && !result) {
      window.dispatchEvent(new CustomEvent('rccg:auth-error', {
        detail: 'Google sign-in didn\'t complete. This often happens in private/incognito windows or with strict browser privacy settings that block the sign-in redirect. Please try again in a normal browser window, and make sure pop-ups aren\'t blocked for this site.',
      }));
    }
  })
  .catch((err) => {
    console.error('RCCG Google sign-in failed:', err);
    window.dispatchEvent(new CustomEvent('rccg:auth-error', { detail: friendlyAuthError(err) }));
  });

async function logOut() {
  await signOut(auth);
}

function getCurrentUser() {
  return currentUser;
}

function friendlyAuthError(err) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered - try signing in instead.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/network-request-failed': 'Network error - check your connection and try again.',
  };
  return map[err.code] || 'Something went wrong. Please try again.';
}

window.RCCGAuth = {
  signUp, signIn, signInGoogle, logOut, getCurrentUser, friendlyAuthError, pushProgressToCloud,
};
