/*
  Buzzlet Profile System
  - Displays a TikTok-inspired profile layout for any user.
  - Handles follow, share, edit profile, and profile content tabs.
*/

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { auth, db, storage } from "./firebase.js";
import { $, formatDate } from "./utils.js";

const profileCard = $("#profile-card");
const toastEl = $("#profile-toast");
const modalRoot = $("#profile-modal-root");

const state = {
  currentUser: null,
  profile: null,
  profileUid: null,
  stats: {
    friendsCount: 0,
    followersCount: 0,
    postsCount: 0
  },
  posts: [],
  reposts: [],
  activeTab: "posts",
  isFollowing: false
};

const showToast = (message) => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2400);
};

const buildProfileUrl = (uid) => {
  const url = new URL(window.location.href);
  url.searchParams.set("uid", uid);
  return url.toString();
};

const ensureModalRoot = () => {
  if (!modalRoot) return;
  if (modalRoot.children.length > 0) return;
  modalRoot.innerHTML = `
    <div class="modal" id="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title" aria-hidden="true">
      <div class="modal-backdrop" data-close></div>
      <div class="modal-card" role="document">
        <button class="modal-close" type="button" data-close aria-label="Close">×</button>
        <h3 id="info-modal-title">Friends vs Followers on Buzzlet</h3>
        <p>Friends are local or nearby connections. These requests are more urgent and are meant for people you actually know.</p>
        <p>Followers can follow you from anywhere. This is for wider, national visibility.</p>
        <p>You can have both friends and followers.</p>
        <p>It’s highly recommended you don’t friend people you don’t know.</p>
        <p>If you want a local gossip page, keep your friends list local.</p>
      </div>
    </div>
    <div class="modal" id="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" aria-hidden="true">
      <div class="modal-backdrop" data-close></div>
      <div class="modal-card" role="document">
        <button class="modal-close" type="button" data-close aria-label="Close">×</button>
        <h3 id="edit-modal-title">Edit Profile</h3>
        <form id="edit-profile-form">
          <label for="edit-displayName">Display name</label>
          <input id="edit-displayName" name="displayName" type="text" required />
          <label for="edit-username">Username</label>
          <input id="edit-username" name="username" type="text" required />
          <label for="edit-bio">Bio</label>
          <textarea id="edit-bio" name="bio" rows="3"></textarea>
          <label for="edit-profilePhotoUrl">Profile photo URL</label>
          <input id="edit-profilePhotoUrl" name="profilePhotoUrl" type="url" placeholder="https://..." />
          <label for="edit-profilePhotoFile">Or upload a new photo</label>
          <input id="edit-profilePhotoFile" name="profilePhotoFile" type="file" accept="image/*" />
          <div class="profile-actions">
            <button type="submit">Save changes</button>
            <button type="button" class="secondary" data-close>Cancel</button>
          </div>
          <p class="profile-safety-note" id="edit-profile-notice"></p>
        </form>
      </div>
    </div>
    <div class="modal" id="post-modal" role="dialog" aria-modal="true" aria-labelledby="post-modal-title" aria-hidden="true">
      <div class="modal-backdrop" data-close></div>
      <div class="modal-card" role="document">
        <button class="modal-close" type="button" data-close aria-label="Close">×</button>
        <div id="post-modal-content"></div>
      </div>
    </div>
  `;
};

const getModal = (id) => $("#".concat(id));
let activeModal = null;
let lastFocusedElement = null;

const trapFocus = (modalEl) => {
  if (!modalEl) return;
  const focusable = Array.from(
    modalEl.querySelectorAll(
      "button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])"
    )
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (document.activeElement) document.activeElement.blur();
  first.focus();

  const handleTab = (event) => {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!modalEl.dataset.trapBound) {
    modalEl.addEventListener("keydown", handleTab);
    modalEl.dataset.trapBound = "true";
  }
};

const openModal = (modalEl) => {
  if (!modalEl) return;
  activeModal = modalEl;
  lastFocusedElement = document.activeElement;
  modalEl.classList.add("is-visible");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  trapFocus(modalEl);
};

const closeModal = (modalEl) => {
  if (!modalEl) return;
  modalEl.classList.remove("is-visible");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  activeModal = null;
};

const closeActiveModal = () => {
  if (activeModal) closeModal(activeModal);
};

const setupModalEvents = () => {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal) {
      closeActiveModal();
    }
  });

  if (!modalRoot) return;
  modalRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.hasAttribute("data-close")) {
      const modalEl = target.closest(".modal");
      if (modalEl) closeModal(modalEl);
    }
  });
};

const renderLoading = () => {
  if (!profileCard) return;
  profileCard.innerHTML = "<p>Loading profile...</p>";
};

const renderProfile = () => {
  if (!profileCard || !state.profile) return;
  const profile = state.profile;
  const isSelf = state.currentUser?.uid === profile.uid;
  const displayInitial = profile.displayName
    ? profile.displayName.charAt(0).toUpperCase()
    : "B";
  const followLabel = state.isFollowing ? "Following" : "Follow";
  const followDisabled = state.isFollowing;

  profileCard.innerHTML = `
    <div class="profile-shell">
      <div class="profile-top">
        <div class="profile-photo">
          ${
            profile.profilePhotoUrl
              ? `<img src="${profile.profilePhotoUrl}" alt="${profile.displayName}" />`
              : `<span aria-hidden="true">${displayInitial}</span>`
          }
        </div>
        <div>
          <div class="profile-name">
            ${profile.displayName} ${profile.verified ? "✅" : ""}
          </div>
          <div class="profile-username">@${profile.username}</div>
          <div class="profile-location">
            Town: ${profile.townName || "Unknown"}, ${profile.townState || ""}
          </div>
        </div>
        <div class="profile-actions">
          ${
            !isSelf
              ? `<button type="button" id="follow-button" ${
                  followDisabled ? "disabled" : ""
                } aria-pressed="${state.isFollowing}">${followLabel}</button>`
              : ""
          }
          ${
            isSelf
              ? `<button type="button" class="secondary" id="edit-profile-button">Edit profile</button>`
              : ""
          }
          <button type="button" class="secondary" id="share-profile-button">Share profile</button>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <span class="profile-stat-value">${state.stats.friendsCount}</span>
          <span class="profile-stat-label">
            Friends
            <button type="button" class="profile-info-button" id="friends-info-button" aria-label="Learn about friends vs followers">ⓘ</button>
          </span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat-value">${state.stats.followersCount}</span>
          <span class="profile-stat-label">Followers</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat-value">${state.stats.postsCount}</span>
          <span class="profile-stat-label">Posts (Originals)</span>
        </div>
      </div>
      <p class="profile-safety-note">Local friend requests are more urgent. It’s highly recommended you don’t friend people you don’t know. If you want a local gossip page, keep it local.</p>
      <p class="profile-safety-note">Friend requests: coming soon.</p>
      <p>${profile.bio || "No bio yet."}</p>
      <div class="profile-tabs" role="tablist">
        <button type="button" class="${
          state.activeTab === "posts" ? "active" : ""
        }" data-tab="posts" aria-pressed="${
    state.activeTab === "posts"
  }">Posts</button>
        <button type="button" class="${
          state.activeTab === "reposts" ? "active" : ""
        }" data-tab="reposts" aria-pressed="${
    state.activeTab === "reposts"
  }">Reposts</button>
      </div>
      <div id="profile-grid"></div>
      <div id="profile-empty" class="profile-empty hidden"></div>
    </div>
  `;

  renderGrid();
  bindProfileActions();
};

const renderGrid = () => {
  const gridEl = $("#profile-grid");
  const emptyEl = $("#profile-empty");
  if (!gridEl || !emptyEl) return;
  gridEl.className = "profile-grid";
  gridEl.innerHTML = "";

  const items = state.activeTab === "posts" ? state.posts : state.reposts;
  if (!items.length) {
    emptyEl.textContent =
      state.activeTab === "posts"
        ? "No posts yet."
        : "No reposts yet.";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");

  items.forEach((post) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-grid-item";
    button.setAttribute("aria-label", "Open post");
    if (post.imageUrl) {
      const img = document.createElement("img");
      img.src = post.imageUrl;
      img.alt = post.title || "Post image";
      button.appendChild(img);
    } else {
      const text = document.createElement("span");
      text.textContent = post.title || post.body?.slice(0, 60) || "Post";
      button.appendChild(text);
    }

    if (post.isRepost) {
      const badge = document.createElement("span");
      badge.className = "profile-grid-badge";
      badge.textContent = "Repost";
      button.appendChild(badge);
    }

    button.addEventListener("click", () => openPostModal(post));
    gridEl.appendChild(button);
  });
};

const loadProfileDoc = async (uid) => {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (!docSnap.exists()) return null;
  return docSnap.data();
};

const loadFollowersCount = async (uid) => {
  const followersSnap = await getDocs(
    query(collection(db, "follows"), where("targetUid", "==", uid))
  );
  return followersSnap.size;
};

const loadFriendsCount = async (uid) => {
  const friendsSnap = await getDocs(
    query(collection(db, "friends"), where("memberUids", "array-contains", uid))
  );
  return friendsSnap.docs.filter((docSnap) => {
    const data = docSnap.data();
    return data.status ? data.status === "accepted" : true;
  }).length;
};

const loadPosts = async (uid) => {
  const postsSnap = await getDocs(
    query(collection(db, "posts"), where("authorUid", "==", uid))
  );
  return postsSnap.docs
    .map((docSnap) => docSnap.data())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const loadReposts = async (uid) => {
  const repostSnap = await getDocs(
    query(collection(db, "reposts"), where("uid", "==", uid))
  );
  const reposts = repostSnap.docs.map((docSnap) => docSnap.data());
  const posts = await Promise.all(
    reposts.map(async (repost) => {
      const postSnap = await getDoc(doc(db, "posts", repost.postId));
      if (!postSnap.exists()) return null;
      return {
        ...postSnap.data(),
        isRepost: true,
        repostedAt: repost.createdAt
      };
    })
  );
  return posts.filter(Boolean).sort((a, b) => {
    return new Date(b.repostedAt) - new Date(a.repostedAt);
  });
};

const checkFollowing = async () => {
  if (!state.currentUser || !state.profileUid) return false;
  if (state.currentUser.uid === state.profileUid) return false;
  const followId = `${state.currentUser.uid}_${state.profileUid}`;
  const followSnap = await getDoc(doc(db, "follows", followId));
  return followSnap.exists();
};

const handleFollow = async () => {
  if (!state.currentUser || !state.profile) return;
  if (state.currentUser.uid === state.profile.uid) return;
  if (state.isFollowing) return;

  const followId = `${state.currentUser.uid}_${state.profile.uid}`;
  await setDoc(doc(db, "follows", followId), {
    followerUid: state.currentUser.uid,
    targetUid: state.profile.uid,
    createdAt: new Date().toISOString()
  });

  state.isFollowing = true;
  state.stats.followersCount += 1;
  renderProfile();
};

const handleShare = async () => {
  if (!state.profile) return;
  const url = buildProfileUrl(state.profile.uid);

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Buzzlet",
        text: "View my profile on Buzzlet.",
        url
      });
      return;
    } catch (error) {
      // Fall back to clipboard copy if sharing fails or is dismissed.
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  showToast("Profile link copied!");
};

const handleEditProfile = () => {
  const modalEl = getModal("edit-modal");
  if (!modalEl || !state.profile) return;
  const displayNameInput = $("#edit-displayName");
  const usernameInput = $("#edit-username");
  const bioInput = $("#edit-bio");
  const photoUrlInput = $("#edit-profilePhotoUrl");
  const noticeEl = $("#edit-profile-notice");

  if (!displayNameInput || !usernameInput || !bioInput || !photoUrlInput) return;

  displayNameInput.value = state.profile.displayName || "";
  usernameInput.value = state.profile.username || "";
  bioInput.value = state.profile.bio || "";
  photoUrlInput.value = state.profile.profilePhotoUrl || "";
  if (noticeEl) noticeEl.textContent = "";

  openModal(modalEl);
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  if (!state.currentUser || !state.profile) return;

  const displayNameInput = $("#edit-displayName");
  const usernameInput = $("#edit-username");
  const bioInput = $("#edit-bio");
  const photoUrlInput = $("#edit-profilePhotoUrl");
  const photoFileInput = $("#edit-profilePhotoFile");
  const noticeEl = $("#edit-profile-notice");

  if (
    !displayNameInput ||
    !usernameInput ||
    !bioInput ||
    !photoUrlInput ||
    !photoFileInput
  ) {
    return;
  }

  const displayName = displayNameInput.value.trim();
  const username = usernameInput.value.trim().toLowerCase();
  const bio = bioInput.value.trim();
  const profilePhotoUrl = photoUrlInput.value.trim();
  const photoFile = photoFileInput.files[0];

  if (!displayName || !username) {
    if (noticeEl) noticeEl.textContent = "Display name and username are required.";
    return;
  }

  if (username !== state.profile.username) {
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const existing = await getDocs(usernameQuery);
    const taken = existing.docs.some(
      (docSnap) => docSnap.id !== state.currentUser.uid
    );
    if (taken) {
      if (noticeEl) noticeEl.textContent = "Username already taken.";
      return;
    }
  }

  let updatedPhotoUrl = state.profile.profilePhotoUrl || "";
  if (photoFile) {
    const photoRef = ref(storage, `profilePhotos/${state.currentUser.uid}`);
    await uploadBytes(photoRef, photoFile);
    updatedPhotoUrl = await getDownloadURL(photoRef);
  } else if (profilePhotoUrl) {
    updatedPhotoUrl = profilePhotoUrl;
  }

  const updatePayload = {
    displayName,
    username,
    bio,
    profilePhotoUrl: updatedPhotoUrl
  };

  await updateDoc(doc(db, "users", state.currentUser.uid), updatePayload);
  state.profile = { ...state.profile, ...updatePayload };
  renderProfile();
  closeActiveModal();
  showToast("Profile updated!");
};

const openPostModal = (post) => {
  const modalEl = getModal("post-modal");
  const contentEl = $("#post-modal-content");
  if (!modalEl || !contentEl) return;
  contentEl.innerHTML = `
    <h3 id="post-modal-title">${post.title || "Post"}</h3>
    <div class="feed-meta">
      <span>${post.authorDisplayName || ""} (@${post.authorUsername || ""})</span>
      <span>•</span>
      <span>${post.createdAt ? formatDate(new Date(post.createdAt)) : ""}</span>
      ${post.scope ? `<span class="badge">${post.scope}</span>` : ""}
    </div>
    <p class="feed-body">${post.body || ""}</p>
    ${
      post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" />` : ""
    }
  `;
  openModal(modalEl);
};

const bindProfileActions = () => {
  const followButton = $("#follow-button");
  const shareButton = $("#share-profile-button");
  const editButton = $("#edit-profile-button");
  const infoButton = $("#friends-info-button");
  const tabButtons = document.querySelectorAll("[data-tab]");

  if (followButton) {
    followButton.addEventListener("click", handleFollow);
  }
  if (shareButton) {
    shareButton.addEventListener("click", handleShare);
  }
  if (editButton) {
    editButton.addEventListener("click", handleEditProfile);
  }
  if (infoButton) {
    infoButton.addEventListener("click", () =>
      openModal(getModal("info-modal"))
    );
  }
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      renderProfile();
    });
  });

  const editForm = $("#edit-profile-form");
  if (editForm && !editForm.dataset.bound) {
    editForm.addEventListener("submit", handleEditSubmit);
    editForm.dataset.bound = "true";
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (profileCard) {
      profileCard.innerHTML = `
        <p>Please log in to view profiles.</p>
        <button type="button" class="secondary" id="profile-login-button">Go to login</button>
      `;
      const loginButton = $("#profile-login-button");
      if (loginButton) {
        loginButton.addEventListener("click", () => {
          window.location.href = "index.html";
        });
      }
    }
    return;
  }
  renderLoading();
  ensureModalRoot();
  setupModalEvents();

  try {
    state.currentUser = user;
    const params = new URLSearchParams(window.location.search);
    state.profileUid = params.get("uid") || user.uid;

    const profile = await loadProfileDoc(state.profileUid);
    if (!profile) {
      if (profileCard) {
        profileCard.innerHTML = "<p>Profile not found.</p>";
      }
      return;
    }
    state.profile = profile;

    if (!params.get("uid")) {
      window.history.replaceState({}, "", buildProfileUrl(profile.uid));
    }

    const [followersCount, friendsCount, posts, reposts] = await Promise.all([
      loadFollowersCount(profile.uid),
      loadFriendsCount(profile.uid),
      loadPosts(profile.uid),
      loadReposts(profile.uid)
    ]);

    state.stats = {
      friendsCount,
      followersCount,
      postsCount: posts.length
    };
    state.posts = posts;
    state.reposts = reposts;
    state.activeTab = "posts";
    state.isFollowing = await checkFollowing();
    renderProfile();
  } catch (error) {
    if (profileCard) {
      profileCard.innerHTML =
        "<p>We ran into a problem loading this profile. Please refresh and try again.</p>";
    }
  }
});
