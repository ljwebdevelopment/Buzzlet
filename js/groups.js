/*
  Buzzlet Groups System
  - Lists private-but-searchable groups and allows join requests.
  - Keeps logic minimal for the MVP while preserving clear structure.
*/

import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { $, showNotice } from "./utils.js";

const groupsList = $("#groups-list");
const groupNotice = $("#groups-notice");

const renderGroup = (group, id, uid) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h3>${group.name}</h3>
    <p>${group.description || "No description yet."}</p>
    <p><strong>Members:</strong> ${group.memberCount || 0} / 50</p>
    <button type="button" data-group="${id}">Request to Join</button>
  `;

  const button = card.querySelector("button");
  button.addEventListener("click", async () => {
    await addDoc(collection(db, "groupJoinRequests"), {
      groupId: id,
      uid,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    showNotice(groupNotice, "Join request sent!", "success");
  });

  return card;
};

const loadGroups = async (uid) => {
  if (!groupsList) return;
  groupsList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "groups"));
  snapshot.forEach((docSnap) => {
    groupsList.appendChild(renderGroup(docSnap.data(), docSnap.id, uid));
  });
};

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadGroups(user.uid);
});
