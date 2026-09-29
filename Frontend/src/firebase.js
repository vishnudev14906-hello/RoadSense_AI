import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  applyActionCode,
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

// Factory to create a fresh GoogleAuthProvider with standard OAuth prompt and scopes
export const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
};

export const googleProvider = getGoogleProvider();

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
  if (!err) return "An error occurred. Please try again.";
  const code = err.code || "";
  const msg = err.message || "";

  // Log full internal error for developer debugging
  console.warn(`[Firebase Auth Debug] Code: "${code}" | Message: "${msg}"`);

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
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/user-disabled":
      return "This account has been suspended. Please contact the administrator.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access has been temporarily disabled. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Google Sign-In was cancelled. Please select a Google account to continue.";
    case "auth/popup-blocked":
      return "Google Sign-In popup was blocked by your browser. Please allow popups for this site.";
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. Please try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for OAuth in the Firebase Console. Please add your domain to Authorized Domains in Firebase Authentication Settings.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection and try again.";
    case "auth/operation-not-allowed":
      return "Google sign-in or Password provider is not enabled in your Firebase project. Please enable it in the Firebase Authentication console.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Please check your Firebase configuration.";
    case "auth/requires-recent-login":
      return "This action requires recent authentication. Please sign in again.";
    case "auth/invalid-action-code":
      return "The password reset link is invalid or has already been used. Please request a new link.";
    case "auth/expired-action-code":
      return "The password reset link has expired. Please request a new reset link.";
    case "auth/password-does-not-meet-requirements":
      return "The password does not meet security requirements. Please choose a stronger password.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email address but different sign-in credentials. Please sign in using your original provider.";
    case "auth/unauthorized-continue-uri":
      return "The redirect URL domain is not authorized in Firebase Console.";
    default:
      return msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim() || "Authentication failed. Please try again.";
  }
};

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  applyActionCode,
  signOut,
  updateProfile,
  onAuthStateChanged
};
