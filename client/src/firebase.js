// Firebase configuration for Google Sign-In
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6voZxbfnqHupe3ZLKHRESVg1LPSB9y9k",
  authDomain: "auto-customizer.firebaseapp.com",
  projectId: "auto-customizer",
  storageBucket: "auto-customizer.firebasestorage.app",
  messagingSenderId: "887836195414",
  appId: "1:887836195414:web:c5fb587ffa2f8753f299f7",
  measurementId: "G-WHBNWZB9JY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Sign in with Google popup
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Get the ID token to send to backend
    const idToken = await result.user.getIdToken();
    return {
      success: true,
      idToken,
      user: {
        email: result.user.email,
        name: result.user.displayName,
        photoURL: result.user.photoURL,
        uid: result.user.uid,
      },
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return {
      success: false,
      error: error.message || "Google Sign-In failed",
    };
  }
};

export default app;
