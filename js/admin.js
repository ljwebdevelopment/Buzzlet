/*
  Buzzlet Admin Dashboard System
  - Provides real admin actions: review reports, manage users, and moderate posts.
  - Keeps actions explicit for beginner clarity.
*/

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase.js";
import { $, showNotice } from "./utils.js";

const reportsList = $("#reports-list");
const usersList = $("#users-list");
const postsList = $("#posts-list");
const adminNotice = $("#admin-notice");

const renderReport = (report, id) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h3>${report.category}</h3>
    <p>${report.reason || "No details provided."}</p>
    <p><strong>Target:</strong> ${report.targetType} (${report.targetId})</p>
    <button type="button" data-resolve="${id}">Mark Resolved</button>
  `;
  card.querySelector("button").addEventListener("click", async () => {
    await updateDoc(doc(db, "reports", id), { status: "resolved" });
    showNotice(adminNotice, "Report resolved.", "success");
    card.remove();
  });
  return card;
};

const renderUser = (user, id) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h3>${user.displayName} (@${user.username})</h3>
    <p>${user.email || ""}</p>
    <div class="grid two">
      <button type="button" data-verify="${id}">Toggle Verified</button>
      <button type="button" class="danger" data-suspend="${id}">Toggle Suspended</button>
    </div>
  `;

  card.querySelector("[data-verify]").addEventListener("click", async () => {
    await updateDoc(doc(db, "users", id), { verified: !user.verified });
    showNotice(adminNotice, "Verification updated.", "success");
  });

  card.querySelector("[data-suspend]").addEventListener("click", async () => {
    await updateDoc(doc(db, "users", id), { suspended: !user.suspended });
    showNotice(adminNotice, "Suspension updated.", "success");
  });

  return card;
};

const renderPost = (post, id) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h3>${post.title || "Post"}</h3>
    <p>${post.body || ""}</p>
    <button type="button" class="danger" data-delete="${id}">Remove Post</button>
  `;
  card.querySelector("button").addEventListener("click", async () => {
    await deleteDoc(doc(db, "posts", id));
    showNotice(adminNotice, "Post removed.", "success");
    card.remove();
  });
  return card;
};

const loadAdminData = async () => {
  if (reportsList) {
    const reportsSnap = await getDocs(collection(db, "reports"));
    reportsSnap.forEach((docSnap) => {
      reportsList.appendChild(renderReport(docSnap.data(), docSnap.id));
    });
  }

  if (usersList) {
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach((docSnap) => {
      usersList.appendChild(renderUser(docSnap.data(), docSnap.id));
    });
  }

  if (postsList) {
    const postsSnap = await getDocs(collection(db, "posts"));
    postsSnap.forEach((docSnap) => {
      postsList.appendChild(renderPost(docSnap.data(), docSnap.id));
    });
  }
};

loadAdminData();
