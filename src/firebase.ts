import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Config parsed from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0830455360",
  appId: "1:767419008595:web:ab26719c4dff15294068a6",
  apiKey: "AIzaSyBbPC4HF3etq9U-BPKAgYpof6Clz8m3AM8",
  authDomain: "gen-lang-client-0830455360.firebaseapp.com",
  storageBucket: "gen-lang-client-0830455360.firebasestorage.app",
  messagingSenderId: "767419008595",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, "ai-studio-smartsalon33-61251e22-c4b0-467f-9b02-030e78905c7a");

// Initialize Auth
export const auth = getAuth(app);

