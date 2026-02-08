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
const loginError = $("#login-error");
const signupError = $("#signup-error");

const currentPage = window.location.pathname.split("/").pop();

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
    showNotice(loginError, "Logged in! Redirecting...", "success");
    sessionStorage.setItem("buzzletOnboard", "true");
    window.location.href = "onboarding.html";
  } catch (error) {
    showNotice(loginError, error.message, "danger");
  }
};

const handleSignup = async (event) => {
  event.preventDefault();
  const email = $("#signup-email").value.trim();
  const password = $("#signup-password").value.trim();
  const confirmPassword = $("#signup-confirm-password").value.trim();

  if (password.length < 6) {
    showNotice(signupError, "Password must be at least 6 characters.", "danger");
    return;
  }

  if (password !== confirmPassword) {
    showNotice(signupError, "Passwords do not match.", "danger");
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(
      doc(db, "users", credential.user.uid),
      {
        uid: credential.user.uid,
        email,
        profileComplete: false,
        isAdmin: false,
        createdAt: new Date().toISOString()
      },
      { merge: true }
    );
    showNotice(signupError, "Account created! Redirecting...", "success");
    sessionStorage.setItem("buzzletOnboard", "true");
    window.location.href = "onboarding.html";
  } catch (error) {
    showNotice(signupError, error.message, "danger");
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

  await setDoc(
    doc(db, "users", user.uid),
    {
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
      profileComplete: true,
      createdAt: new Date().toISOString()
    },
    { merge: true }
  );

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
    if (currentPage === "index.html" || currentPage === "signup.html") {
      const needsOnboarding = sessionStorage.getItem("buzzletOnboard") === "true";
      window.location.href = needsOnboarding ? "onboarding.html" : "town.html";
      return;
    }
    if (currentPage === "profile.html") {
      checkProfile(user);
    }
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

const setupOnboarding = () => {
  const addButton = $("#add-to-home");
  const skipButton = $("#skip-home");
  const banner = $("#onboard-banner");
  const bannerClose = $("#banner-close");
  const tip = $("#onboard-tip");

  if (!addButton || !skipButton) return;

  sessionStorage.removeItem("buzzletOnboard");

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  const goToFeed = () => {
    window.location.href = "town.html";
  };

  addButton.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      goToFeed();
      return;
    }

    showNotice(
      tip,
      "On iPhone/iPad, use Share → Add to Home Screen.",
      "info"
    );
    setTimeout(goToFeed, 800);
  });

  skipButton.addEventListener("click", () => {
    if (banner) {
      banner.classList.add("show");
    }
    setTimeout(goToFeed, 1000);
  });

  if (bannerClose) {
    bannerClose.addEventListener("click", () => {
      banner?.classList.remove("show");
    });
  }
};

setupOnboarding();
