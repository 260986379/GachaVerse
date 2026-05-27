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
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyByVS5wk-vZDZQr3C9sbFmgDFmarjkl32E',
  authDomain:        'gachaverse-497204.firebaseapp.com',
  projectId:         'gachaverse-497204',
  storageBucket:     'gachaverse-497204.firebasestorage.app',
  messagingSenderId: '50606435860',
  appId:             '1:50606435860:web:0f295f96583f77f05b8101',
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
}
