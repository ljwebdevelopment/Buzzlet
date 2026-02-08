/*
  Buzzlet Profile System
  - Displays the logged-in user's public profile details.
  - Safe defaults so the page doesn't break if fields are missing.
*/

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { $ } from "./utils.js";

const profileCard = $("#profile-card");

// A simple fallback avatar (safe inline SVG so you don't need an assets folder)
const FALLBACK_AVATAR =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
      <rect width="100%" height="100%" fill="#111"/>
      <circle cx="120" cy="92" r="44" fill="#2a2a2a"/>
      <rect x="48" y="150" width="144" height="60" rx="30" fill="#2a2a2a"/>
    </svg>
  `);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLoading() {
  if (!profileCard) return;
  profileCard.innerHTML = `
    <div class="card">
      <p>Loading profile…</p>
    </div>
  `;
}

function renderSignedOut() {
  if (!profileCard) return;
  profileCard.innerHTML = `
    <div class="card">
      <p>You are not signed in.</p>
      <p class="small">Please sign in to view your profile.</p>
    </div>
  `;
}

function renderNotFound() {
  if (!profileCard) return;
  profileCard.innerHTML = `
    <div class="card">
      <p>Profile not found.</p>
      <p class="small">Your user document hasn’t been created yet.</p>
    </div>
  `;
}

function renderError(message) {
  if (!profileCard) return;
  profileCard.innerHTML = `
    <div class="card">
      <p>Couldn’t load profile.</p>
      <p class="small">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderProfile(profile) {
  if (!profileCard) return;

  const displayName = profile.displayName || "Buzzlet User";
  const username = profile.username || "unknown";
  const bio = profile.bio || "No bio yet.";
  const townName = profile.townName || "Unknown town";
  const townState = profile.townState || "";
  const verified = profile.verified === true;

  const friendsCount = Number.isFinite(profile.friendsCount) ? profile.friendsCount : 0;
  const followersCount = Number.isFinite(profile.followersCount) ? profile.followersCount : 0;

  // Use a safe fallback if profilePhotoUrl is missing/empty
  const photoUrl = (profile.profilePhotoUrl && String(profile.profilePhotoUrl).trim()) || FALLBACK_AVATAR;

  profileCard.innerHTML = `
    <img
      src="${escapeHtml(photoUrl)}"
      alt="${escapeHtml(displayName)}"
      onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';"
    />
    <h2>${escapeHtml(displayName)} ${verified ? "✅" : ""}</h2>
    <p>@${escapeHtml(username)}</p>
    <p>${escapeHtml(bio)}</p>
    <p><strong>Town:</strong> ${escapeHtml(townName)}${townState ? ", " + escapeHtml(townState) : ""}</p>
    <div class="grid two">
      <div class="card">Friends: ${friendsCount}</div>
      <div class="card">Followers: ${followersCount}</div>
    </div>
  `;
}

// Main
renderLoading();

onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      renderSignedOut();
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      renderNotFound();
      return;
    }

    renderProfile(snap.data());
  } catch (err) {
    console.error("Profile load error:", err);
    renderError(err?.message || "Unknown error");
  }
});
