import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getStorage } from 'firebase/storage'

// Firebase web config.
//
// These are PUBLIC identifiers, not secrets. Vite inlines them into the client
// bundle at build time, so anyone who opens the site can read them — that is
// true however they are stored, and Google documents the web API key as a public
// identifier. Moving them to env vars does not hide them. What it buys is the
// ability to point a build at a different Firebase project, or to rotate the
// key, without editing source.
//
// The committed values remain as defaults so a plain `npm run build` — including
// the Cloud Build step in cloudbuild.yaml, which passes no env vars — still
// produces a working bundle. Override any of them via frontend/.env; see
// frontend/.env.example.
//
// What actually protects this project is configured server-side, not here:
//   - Firebase Auth authorized domains
//   - email enumeration protection (enableImprovedEmailPrivacy)
//   - API key restrictions in the Google Cloud console
const env = import.meta.env

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY             || 'AIzaSyByVS5wk-vZDZQr3C9sbFmgDFmarjkl32E',
  // Must be the domain the site is served from. Google sign-in uses a redirect,
  // and browsers partition storage by site: with authDomain on firebaseapp.com
  // the redirect result is unreadable on mygachalist.com and the user comes back
  // signed out. Firebase Hosting serves /__/auth/handler on the custom domain.
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN         || 'mygachalist.com',
  projectId:         env.VITE_FIREBASE_PROJECT_ID          || 'gachaverse-497204',
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET      || 'gachaverse-497204.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '50606435860',
  appId:             env.VITE_FIREBASE_APP_ID              || '1:50606435860:web:0f295f96583f77f05b8101',
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
// User-uploaded images (avatars, banners, boards); see utils/imageUpload.js and storage.rules
const storage = getStorage(app)

export {
  auth,
  storage,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  sendPasswordResetEmail,
}
