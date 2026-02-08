/*
  Buzzlet Auth System
  - Handles login, signup, and profile completion.
  - Ensures users fill required profile fields on first login.
*/

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { auth, db, storage } from "./firebase.js";
import { $, showNotice } from "./utils.js";

const loginForm = $("#login-form");
const signupForm = $("#signup-form");
const profileForm = $("#profile-form");
const profileSection = $("#profile-section");
const authNotice = $("#auth-notice");

const populateCities = async () => {
  const citySelect = $("#homeTownId");
  if (!citySelect) return;

  const snapshot = await getDocs(collection(db, "cities"));
  snapshot.forEach((docSnap) => {
    const city = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = `${city.name}, ${city.stateCode}`;
    citySelect.appendChild(option);
  });
};

const showProfileForm = () => {
  if (profileSection) {
    profileSection.classList.remove("hidden");
  }
};

const hideProfileForm = () => {
  if (profileSection) {
    profileSection.classList.add("hidden");
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showNotice(authNotice, "Logged in! Redirecting...", "success");
  } catch (error) {
    showNotice(authNotice, error.message, "danger");
  }
};

const handleSignup = async (event) => {
  event.preventDefault();
  const email = $("#signup-email").value.trim();
  const password = $("#signup-password").value.trim();

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showNotice(authNotice, "Account created! Complete your profile.", "success");
  } catch (error) {
    showNotice(authNotice, error.message, "danger");
  }
};

const handleProfile = async (event) => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const displayName = $("#displayName").value.trim();
  const username = $("#username").value.trim().toLowerCase();
  const bio = $("#bio").value.trim();
  const homeTownId = $("#homeTownId").value;
  const age = $("#age").value.trim();
  const file = $("#profilePhoto").files[0];

  if (!file) {
    showNotice(authNotice, "Profile photo is required.", "danger");
    return;
  }

  const usernameQuery = query(
    collection(db, "users"),
    where("username", "==", username)
  );
  const existing = await getDocs(usernameQuery);
  if (!existing.empty) {
    showNotice(authNotice, "Username already taken.", "danger");
    return;
  }

  const cityDoc = await getDoc(doc(db, "cities", homeTownId));
  const cityData = cityDoc.exists() ? cityDoc.data() : {};

  const photoRef = ref(storage, `profilePhotos/${user.uid}`);
  await uploadBytes(photoRef, file);
  const photoUrl = await getDownloadURL(photoRef);

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName,
    username,
    bio,
    homeTownId,
    currentViewingTownId: homeTownId,
    stateCode: cityData.stateCode || "",
    townName: cityData.name || "",
    townState: cityData.state || "",
    age,
    profilePhotoUrl: photoUrl,
    friendsCount: 0,
    followersCount: 0,
    verified: false,
    isAdmin: false,
    profileComplete: true,
    createdAt: new Date().toISOString()
  });

  showNotice(authNotice, "Profile saved!", "success");
  setTimeout(() => {
    window.location.href = "town.html";
  }, 800);
};

const checkProfile = async (user) => {
  if (!user) return;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists() || !userDoc.data().profileComplete) {
    showProfileForm();
    await populateCities();
  } else {
    hideProfileForm();
    window.location.href = "town.html";
  }
};

const handleLogout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

if (loginForm) loginForm.addEventListener("submit", handleLogin);
if (signupForm) signupForm.addEventListener("submit", handleSignup);
if (profileForm) profileForm.addEventListener("submit", handleProfile);

const logoutButton = $("#logout-button");
if (logoutButton) logoutButton.addEventListener("click", handleLogout);

onAuthStateChanged(auth, (user) => {
  if (user) {
    checkProfile(user);
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
