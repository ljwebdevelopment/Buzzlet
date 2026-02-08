/*
  Buzzlet Profile System
  - Displays the logged-in user's public profile details.
*/

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { $ } from "./utils.js";

const profileCard = $("#profile-card");

const renderProfile = (profile) => {
  if (!profileCard) return;
  profileCard.innerHTML = `
    <img src="${profile.profilePhotoUrl}" alt="${profile.displayName}" />
    <h2>${profile.displayName} ${profile.verified ? "✅" : ""}</h2>
    <p>@${profile.username}</p>
    <p>${profile.bio || "No bio yet."}</p>
    <p><strong>Town:</strong> ${profile.townName}, ${profile.townState}</p>
    <div class="grid two">
      <div class="card">Friends: ${profile.friendsCount || 0}</div>
      <div class="card">Followers: ${profile.followersCount || 0}</div>
    </div>
  `;
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const docSnap = await getDoc(doc(db, "users", user.uid));
  if (docSnap.exists()) {
    renderProfile(docSnap.data());
  }
});
