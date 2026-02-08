/*
  Buzzlet National Feed System
  - Shows national posts and a simple trending list.
  - Trending score uses the transparent formula from requirements.
*/

import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase.js";
import { $, formatDate } from "./utils.js";

const feedEl = $("#national-feed");
const trendingEl = $("#trending-list");

const calculateScore = (post) => {
  const likeCount = post.likeCount || 0;
  const commentCount = post.commentCount || 0;
  const teaCount = post.teaCount || 0;
  const verifiedBoost = post.authorVerified ? 1 : 0;
  return likeCount + 2 * commentCount + 2 * teaCount + verifiedBoost;
};

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
  `;
  return wrapper;
};

const renderTrendingItem = (post) => {
  const item = document.createElement("div");
  item.className = "card";
  item.innerHTML = `
    <strong>${post.title || post.body?.slice(0, 60) || "Untitled"}</strong>
    <div class="feed-meta">
      <span>Score: ${calculateScore(post)}</span>
      <span>•</span>
      <span>${formatDate(new Date(post.createdAt))}</span>
    </div>
  `;
  return item;
};

const loadNationalFeed = async () => {
  if (!feedEl) return;
  feedEl.innerHTML = "";

  const nationalQuery = query(
    collection(db, "posts"),
    where("scope", "==", "national"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(nationalQuery);
  const posts = snapshot.docs.map((doc) => doc.data());

  posts.forEach((post) => feedEl.appendChild(renderPost(post)));
  buildTrending(posts);
};

const buildTrending = (posts) => {
  if (!trendingEl) return;
  trendingEl.innerHTML = "";

  const now = Date.now();
  const dayWindow = 24 * 60 * 60 * 1000;
  const weekWindow = 7 * dayWindow;

  const todayPosts = posts.filter(
    (post) => now - new Date(post.createdAt).getTime() <= dayWindow
  );
  const weekPosts = posts.filter(
    (post) => now - new Date(post.createdAt).getTime() <= weekWindow
  );

  const topToday = todayPosts
    .sort((a, b) => calculateScore(b) - calculateScore(a))
    .slice(0, 3);
  const topWeek = weekPosts
    .sort((a, b) => calculateScore(b) - calculateScore(a))
    .slice(0, 3);

  const todayBlock = document.createElement("div");
  todayBlock.innerHTML = "<h3>Today</h3>";
  topToday.forEach((post) => todayBlock.appendChild(renderTrendingItem(post)));

  const weekBlock = document.createElement("div");
  weekBlock.innerHTML = "<h3>This Week</h3>";
  topWeek.forEach((post) => weekBlock.appendChild(renderTrendingItem(post)));

  trendingEl.appendChild(todayBlock);
  trendingEl.appendChild(weekBlock);
};

loadNationalFeed();
