import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';

// --------------------------------------------------------------------------
// REPLACE THE CONFIG BELOW WITH YOUR FIREBASE CONFIG FROM FIREBASE CONSOLE:
// Go to Firebase Console -> Project Settings -> General -> Your apps -> SDK setup
// --------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyDl4X_ZTdL1SwpU4Nds1tIRBgp510PDmGA",
  authDomain: "attendance-app-c3742.firebaseapp.com",
  projectId: "attendance-app-c3742",
  storageBucket: "attendance-app-c3742.firebasestorage.app",
  messagingSenderId: "932851771305",
  appId: "1:932851771305:web:a12fc8ca94bf05fa0d86b8",
  measurementId: "G-XHSLCC1X8D"
};

// Check if config has valid keys
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
};

let app, auth, db;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.warn("Firebase initialization error:", error);
}

export { app, auth, db };
