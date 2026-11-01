/* Sign-in and cross-device progress sync (Firebase Authentication + Firestore).

   This module is loaded only when someone opens the account dialog, or when a
   returning signed-in visitor arrives — guests never download Firebase.

   Progress stays in localStorage on every device. On sign-in the saved cloud
   progress is union-merged with the device's progress, so nothing completed as
   a guest is lost, and later completions are pushed up in the background. */
import { firebaseConfig } from './firebase-config.js';
import {
  loadProgress, saveProgress, mergeProgress, getActivity, saveActivity, mergeActivity, getCompletedOn, saveCompletedOn,
  mergeCompletedOn, getPrivateData, savePrivateData, mergeByUpdatedAt, getShared, setSharedLocal,
} from './store.js';
import { debounce } from './ui.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.13.0';
const HINT_KEY = 'rccg-account-hint';

let api;
export function loadAuth() {
  if (!api) api = init().catch((error) => { api = null; throw error; });
  return api;
}

export function friendlyAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in instead.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/missing-password': 'Please enter your password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/user-disabled': 'This account has been disabled. Please contact the church office.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.',
    'auth/unauthorized-domain': 'Sign-in isn’t enabled for this web address yet. Please tell the site owner.',
    'auth/operation-not-allowed': 'This sign-in method isn’t switched on yet. Please tell the site owner.',
    'auth/invalid-api-key': 'Sign-in isn’t set up correctly. Please tell the site owner.',
    'permission-denied': 'Your progress couldn’t be saved to your account. Please tell the site owner.',
  };
  return messages[error?.code] || 'Something went wrong. Please try again.';
}

const publicUser = (user) => (user ? {
  uid: user.uid,
  name: user.displayName || (user.email ? user.email.split('@')[0] : 'Account'),
  email: user.email || '',
  emailVerified: Boolean(user.emailVerified),
} : null);

async function init() {
  const [{ initializeApp }, authSdk, fsSdk] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  const db = fsSdk.getFirestore(app);
  let current = null;
  let syncing = false;

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const progressRef = (uid) => fsSdk.doc(db, 'progress', uid);
  const privateRef = (uid) => fsSdk.doc(db, 'private', uid);

  /* What a class leader can see (only when the learner opts in): name, email,
     study progress, study days. Notes and bookmarks live in 'private' instead. */
  const progressPayload = (user, extra = {}) => ({
    modules: loadProgress(),
    activity: getActivity(),
    completed: getCompletedOn(),
    updatedAt: Date.now(),
    name: publicUser(user).name,
    email: user.email || null,
    ...extra,
  });

  async function syncOnSignIn(user) {
    if (syncing) return;
    syncing = true;
    try {
      const [snap, privSnap] = await Promise.all([fsSdk.getDoc(progressRef(user.uid)), fsSdk.getDoc(privateRef(user.uid))]);
      const remote = snap.exists() ? snap.data() : {};
      const merged = mergeProgress(loadProgress(), remote.modules || {});
      saveProgress(merged);
      saveActivity(mergeActivity(getActivity(), remote.activity));
      saveCompletedOn(mergeCompletedOn(getCompletedOn(), remote.completed));
      setSharedLocal(remote.shared === true);
      await fsSdk.setDoc(progressRef(user.uid), progressPayload(user), { merge: true });

      const remotePrivate = privSnap.exists() ? privSnap.data() : {};
      const local = getPrivateData();
      const mergedPrivate = {
        notes: mergeByUpdatedAt(local.notes, remotePrivate.notes),
        bookmarks: mergeByUpdatedAt(local.bookmarks, remotePrivate.bookmarks),
        positions: mergeByUpdatedAt(local.positions, remotePrivate.positions),
      };
      savePrivateData(mergedPrivate);
      await fsSdk.setDoc(privateRef(user.uid), { ...mergedPrivate, updatedAt: Date.now() }, { merge: true });
      emit('rccg:progress-synced', merged);
      emit('rccg:private-synced', mergedPrivate);
    } catch (error) {
      emit('rccg:sync-error', friendlyAuthError(error));
    } finally {
      syncing = false;
    }
  }

  const pushProgress = debounce(async () => {
    if (!current) return;
    try {
      await fsSdk.setDoc(progressRef(current.uid), progressPayload(current), { merge: true });
    } catch (error) {
      emit('rccg:sync-error', friendlyAuthError(error));
    }
  }, 600);
  window.addEventListener('rccg:progress-changed', pushProgress);

  const pushPrivate = debounce(async () => {
    if (!current) return;
    try {
      await fsSdk.setDoc(privateRef(current.uid), { ...getPrivateData(), updatedAt: Date.now() }, { merge: true });
    } catch (error) {
      emit('rccg:sync-error', friendlyAuthError(error));
    }
  }, 1200);
  window.addEventListener('rccg:private-changed', pushPrivate);

  const ready = new Promise((resolve) => {
    let first = true;
    authSdk.onAuthStateChanged(auth, (user) => {
      current = user;
      const person = publicUser(user);
      try {
        if (person) localStorage.setItem(HINT_KEY, JSON.stringify({ name: person.name }));
        else localStorage.removeItem(HINT_KEY);
      } catch { /* ignore */ }
      emit('rccg:auth-changed', person);
      if (user) syncOnSignIn(user);
      if (first) { first = false; resolve(); }
    });
  });

  // Finish a Google sign-in that fell back to a full-page redirect.
  const redirectPending = sessionStorage.getItem('rccg-google-redirect-pending') === '1';
  sessionStorage.removeItem('rccg-google-redirect-pending');
  if (redirectPending) {
    try { await authSdk.getRedirectResult(auth); }
    catch (error) { emit('rccg:auth-error', friendlyAuthError(error)); }
  }
  await ready;

  return {
    getCurrentUser: () => publicUser(current),

    async signUp(email, password, displayName) {
      const cred = await authSdk.createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await authSdk.updateProfile(cred.user, { displayName });
      let verificationSent = true;
      try { await authSdk.sendEmailVerification(cred.user); } catch { verificationSent = false; }
      const person = publicUser(auth.currentUser);
      try { if (person) localStorage.setItem(HINT_KEY, JSON.stringify({ name: person.name })); } catch { /* ignore */ }
      emit('rccg:auth-changed', person);
      return { user: publicUser(cred.user), verificationSent };
    },

    async signIn(email, password) {
      const cred = await authSdk.signInWithEmailAndPassword(auth, email, password);
      return publicUser(cred.user);
    },

    async signInGoogle() {
      const provider = new authSdk.GoogleAuthProvider();
      try {
        // Popup first: it works in private windows where the redirect flow can fail.
        const cred = await authSdk.signInWithPopup(auth, provider);
        return publicUser(cred.user);
      } catch (error) {
        if (!['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error.code)) throw error;
        sessionStorage.setItem('rccg-google-redirect-pending', '1');
        await authSdk.signInWithRedirect(auth, provider);
        return null;
      }
    },

    resetPassword: (email) => authSdk.sendPasswordResetEmail(auth, email),

    async resendVerification() {
      if (!auth.currentUser) throw new Error('Not signed in');
      await authSdk.sendEmailVerification(auth.currentUser);
    },

    async refreshUser() {
      if (!auth.currentUser) return null;
      await auth.currentUser.reload();
      const person = publicUser(auth.currentUser);
      emit('rccg:auth-changed', person);
      return person;
    },

    isSharing: () => getShared(),

    /** Opt in or out of showing name, email and progress to class leaders. */
    async setSharing(shared) {
      if (!auth.currentUser) throw new Error('Not signed in');
      await fsSdk.setDoc(progressRef(auth.currentUser.uid), progressPayload(auth.currentUser, { shared: Boolean(shared) }), { merge: true });
      setSharedLocal(shared);
    },

    /** True only for people the site owner has approved as class leaders. */
    async isLeader() {
      if (!auth.currentUser) return false;
      try {
        const snap = await fsSdk.getDoc(fsSdk.doc(db, 'leaders', auth.currentUser.uid));
        return snap.exists() && snap.data().active === true;
      } catch {
        return false;
      }
    },

    /** Everyone who chose to share their progress (leaders only; the rules enforce this). */
    async listSharedLearners() {
      const result = await fsSdk.getDocs(fsSdk.query(fsSdk.collection(db, 'progress'), fsSdk.where('shared', '==', true)));
      return result.docs.map((d) => ({ uid: d.id, ...d.data() }));
    },

    logOut: () => authSdk.signOut(auth),
  };
}
