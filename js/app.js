/*
  Buzzlet App Shell System
  - Guards pages so only authenticated users can interact.
  - Injects shared navigation state and admin visibility.
*/

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { $$ } from "./utils.js";

const setActiveNav = () => {
  const current = window.location.pathname.split("/").pop();
  $$("nav a").forEach((link) => {
    if (link.getAttribute("href") === current) {
      link.classList.add("active");
    }
  });
};

const updateAdminNav = async (user) => {
  const adminLink = document.querySelector("[data-admin-link]");
  if (!adminLink) return;

  if (!user) {
    adminLink.classList.add("hidden");
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const isAdmin = userDoc.exists() && userDoc.data().isAdmin;
  adminLink.classList.toggle("hidden", !isAdmin);
};

const guardPage = () => {
  const protectedPages = [
    "town.html",
    "national.html",
    "profile.html",
    "groups.html",
    "messages.html",
    "admin.html",
    "onboarding.html"
  ];
  const current = window.location.pathname.split("/").pop();
  if (!protectedPages.includes(current)) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    await updateAdminNav(user);

    if (current === "admin.html") {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin;
      if (!isAdmin) {
        window.location.href = "town.html";
      }
    }

    if (current === "town.html" || current === "national.html") {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const profileComplete = userDoc.exists() && userDoc.data().profileComplete;
      if (!profileComplete) {
        window.location.href = "profile.html";
      }
    }
  });
};

setActiveNav();
updateAdminNav(auth.currentUser);
guardPage();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
