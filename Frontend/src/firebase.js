import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";

// Exact Firebase Web Configuration provided for RoadSense AI
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDrq4zwQnOojmikivBa8cUa_asrQFbkr9A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "roadsense-ai-1b4e0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "roadsense-ai-1b4e0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "roadsense-ai-1b4e0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "621137176392",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:621137176392:web:d2ebb9269bc01e887a757d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6YXK5C4MY4"
};

// Initialize Firebase App instance safely
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth service
export const auth = getAuth(firebaseApp);

// Initialize Firebase Analytics safely (supported in browser environments)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(firebaseApp);
    }
  }).catch(() => {});
}

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configure Persistence (Remember Me vs Session)
export const configurePersistence = async (rememberMe = true) => {
  try {
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
  } catch (err) {
    console.warn("[Firebase Auth] Persistence configuration notice:", err.message);
  }
};

// User-friendly error message formatter for Firebase error codes
export const formatFirebaseError = (err) => {
  if (!err) return "An unexpected authentication error occurred.";
  const code = err.code || "";
  const msg = err.message || "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please provide a valid email address.";
    case "auth/user-disabled":
      return "This account has been suspended. Please contact the administrator.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access to this account has been temporarily disabled. Please try again later or reset your password.";
    case "auth/popup-closed-by-user":
      return "Google Sign-In popup was closed before completing authentication.";
    case "auth/popup-blocked":
      return "Google Sign-In popup was blocked by your browser. Please allow popups for this site.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in the Firebase Console.";
    case "auth/requires-recent-login":
      return "This action requires recent authentication. Please sign in again.";
    default:
      return msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim() || "Authentication failed.";
  }
};

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
};
