/* Firebase web configuration for the RCCG Learning Path project.

   These values identify the Firebase project to the browser. They are NOT
   passwords: what actually protects the data is the set of Firestore security
   rules (see FIRESTORE_RULES.txt and docs/FIREBASE_LOGIN_SETUP.md).

   At deploy time the build can replace this file with values taken from GitHub
   repository secrets (see docs/FIREBASE_LOGIN_SETUP.md). If those secrets are
   not set, the values below are used as they are. */

export const firebaseConfig = {
  apiKey: "AIzaSyBI5A4GWt490G13IXUxKqeV8sJsjaGbinc",
  authDomain: "rccg-training-portal.firebaseapp.com",
  projectId: "rccg-training-portal",
  storageBucket: "rccg-training-portal.firebasestorage.app",
  messagingSenderId: "79350399191",
  appId: "1:79350399191:web:3335844d4d0b0b6b90b092",
  measurementId: "G-NKRK8K09FT",
};
