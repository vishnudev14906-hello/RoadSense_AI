import { initializeApp, getApps, getApp } from "firebase/app";
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

// Firebase Project Configuration
// Reads from environment variables (VITE_FIREBASE_*) with safe fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoRoadSenseKeyForFirebase2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "roadsense-ai-auth.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "roadsense-ai-auth",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "roadsense-ai-auth.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:8a9b0c1d2e3f4a5b6c7d8e"
};

// Initialize Firebase App instance safely
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth service
export const auth = getAuth(firebaseApp);

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
      if (msg.includes("API key not valid") || msg.includes("invalid-api-key")) {
        return "Firebase API Key needs configuration in .env (VITE_FIREBASE_API_KEY).";
      }
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
