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
  apiKey: "AIzaSyBlr5Zlvj04qFYVHgDO4RN5dhCCvDG5Gbw",
  authDomain: "buzzlet-4246c.firebaseapp.com",
  projectId: "buzzlet-4246c",
  storageBucket: "buzzlet-4246c.firebasestorage.app",
  messagingSenderId: "659384490910",
  appId: "1:659384490910:web:f1ed5dc5d54bd39ae6948f",
  measurementId: "G-S1713Q2CY9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
