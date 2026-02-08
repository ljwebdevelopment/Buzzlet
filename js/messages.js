/*
  Buzzlet Messages System
  - Allows private one-to-one messaging between users.
  - Uses Firestore subcollections for thread messages.
*/

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { $, showNotice } from "./utils.js";

const threadList = $("#threads-list");
const messageForm = $("#message-form");
const messageBody = $("#message-body");
const messageNotice = $("#messages-notice");

const renderThread = (thread) => {
  const item = document.createElement("div");
  item.className = "card";
  item.innerHTML = `
    <h3>${thread.title || "Direct Message"}</h3>
    <p>${thread.lastMessage || "No messages yet."}</p>
  `;
  return item;
};

const loadThreads = async (uid) => {
  if (!threadList) return;
  threadList.innerHTML = "";

  const snapshot = await getDocs(
    query(collection(db, "dmThreads"), where("members", "array-contains", uid))
  );

  snapshot.forEach((docSnap) => {
    threadList.appendChild(renderThread(docSnap.data()));
  });
};

const sendMessage = async (uid) => {
  const threadId = $("#thread-id").value.trim();
  const body = messageBody.value.trim();
  if (!threadId || !body) {
    showNotice(messageNotice, "Thread ID and message are required.", "danger");
    return;
  }

  await addDoc(collection(db, "dmThreads", threadId, "messages"), {
    senderUid: uid,
    body,
    createdAt: new Date().toISOString()
  });
  showNotice(messageNotice, "Message sent!", "success");
  messageBody.value = "";
};

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadThreads(user.uid);
  if (messageForm) {
    messageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(user.uid);
    });
  }
});
