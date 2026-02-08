/*
  Buzzlet Town Feed System
  - Loads posts relevant to the current viewing town.
  - Includes town, statewide, and national posts.
*/

import {
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { $, formatDate } from "./utils.js";

const feedEl = $("#town-feed");
const noticeEl = $("#town-notice");

const renderPost = (post) => {
  const wrapper = document.createElement("article");
  wrapper.className = "feed-item";
  wrapper.innerHTML = `
    <div class="feed-meta">
      <span>${post.authorDisplayName} (@${post.authorUsername})</span>
      <span>•</span>
      <span>${formatDate(new Date(post.createdAt))}</span>
      <span class="badge">${post.scope}</span>
    </div>
    ${post.title ? `<div class="feed-title">${post.title}</div>` : ""}
    <div class="feed-body">${post.body || ""}</div>
    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" />` : ""}
    <div class="reaction-bar">
      <button type="button">👍 ${post.likeCount || 0}</button>
      <button type="button">🔥 ${post.fireCount || 0}</button>
      <button type="button">🫖 ${post.teaCount || 0}</button>
    </div>
  `;
  return wrapper;
};

const loadTownFeed = async (userProfile) => {
  if (!feedEl) return;
  feedEl.innerHTML = "";

  const townId = userProfile.currentViewingTownId;
  const stateCode = userProfile.stateCode;

  const townQuery = query(
    collection(db, "posts"),
    where("townId", "==", townId),
    orderBy("createdAt", "desc")
  );

  const stateQuery = query(
    collection(db, "posts"),
    where("stateCode", "==", stateCode),
    orderBy("createdAt", "desc")
  );

  const nationalQuery = query(
    collection(db, "posts"),
    where("scope", "==", "national"),
    orderBy("createdAt", "desc")
  );

  const [townSnap, stateSnap, nationalSnap] = await Promise.all([
    getDocs(townQuery),
    getDocs(stateQuery),
    getDocs(nationalQuery)
  ]);

  const posts = [
    ...townSnap.docs.map((doc) => doc.data()),
    ...stateSnap.docs.map((doc) => doc.data()),
    ...nationalSnap.docs.map((doc) => doc.data())
  ];

  if (posts.length === 0) {
    noticeEl.textContent = "No posts yet. Be the first to share local tea!";
    return;
  }

  posts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((post) => feedEl.appendChild(renderPost(post)));
};

const loadGuestFeed = async () => {
  if (!feedEl) return;
  feedEl.innerHTML = "";
  noticeEl.textContent =
    "Log in to customize your town feed. Showing national posts for now.";

  const nationalQuery = query(
    collection(db, "posts"),
    where("scope", "==", "national"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(nationalQuery);
  snapshot
    .docs.map((doc) => doc.data())
    .forEach((post) => feedEl.appendChild(renderPost(post)));
};

const loadProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  return userDoc.data();
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await loadGuestFeed();
    return;
  }
  const profile = await loadProfile(user.uid);
  if (!profile) return;
  await loadTownFeed(profile);
});
