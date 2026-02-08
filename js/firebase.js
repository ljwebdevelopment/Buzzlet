/*
  Buzzlet Firebase System
  - Initializes Firebase services (Auth, Firestore, Storage).
  - Exposes shared instances for the rest of the app.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// TODO: Replace with your Firebase project configuration.
const firebaseConfig = {
    apiKey: "AIzaSyDNWSJLTUHWJoRDzl6wa5dW5brSsJSfbVA",
  authDomain: "buzzlet-49327.firebaseapp.com",
  projectId: "buzzlet-49327",
  storageBucket: "buzzlet-49327.firebasestorage.app",
  messagingSenderId: "998427416085",
  appId: "1:998427416085:web:0ef82f8dc0593b5873201c",
  measurementId: "G-H1SWRZHL84"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
