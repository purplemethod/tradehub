import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with custom settings
export const auth = getAuth(app);
auth.useDeviceLanguage();
auth.settings.appVerificationDisabledForTesting = false;

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });


// Configure Google Auth Provider
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account",
  // Add any additional OAuth scopes if needed
  // scopes: ['https://www.googleapis.com/auth/userinfo.email']
});

// Initialize Firestore
export const firestoreDB = getFirestore(app);

// Add error handling for auth popup
window.addEventListener("error", (event) => {
  if (event.message.includes("Cross-Origin-Opener-Policy")) {
    console.warn("COOP policy warning - this is expected in development");
  }
});
