# Buzzlet (Local-First Social Network MVP)

## System Overview (Plain English)
- **Authentication System**: Uses Firebase Auth (Email/Password) to ensure every user is real and logged in before they can interact.
- **Profile System**: Forces a complete profile on first login (name, username, photo, town, age) so the community stays credible.
- **Town Feed System**: Shows posts from the selected town, statewide posts, and national posts in one place.
- **National Feed + Trending System**: Displays national posts and calculates a transparent trending score for recent posts.
- **Groups System**: Lets users discover and request access to private groups (max 50 members).
- **Messages System**: Enables private one-to-one chats with strong privacy rules.
- **Admin System**: Gives admins real tools to review reports, verify users, suspend users, and remove posts.
- **PWA System**: Uses a manifest and service worker so Buzzlet can be installed and cached offline.

## Folder Structure
```
/html
  index.html
  town.html
  national.html
  profile.html
  groups.html
  messages.html
  admin.html
/css
  styles.css
/js
  firebase.js
  auth.js
  app.js
  town.js
  national.js
  profile.js
  groups.js
  messages.js
  admin.js
  utils.js
/manifest.webmanifest
/service-worker.js
/firestore.rules
```

## Firebase Setup (Beginner Steps)
1. Create a Firebase project.
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore Database** (production mode).
4. Create a **Storage bucket** (default settings are fine).
5. Copy your Firebase config into `js/firebase.js`.
6. Deploy the Firestore rules in `firestore.rules`.
7. Add a curated list of towns in Firestore:
   - `cities/{cityId}` with fields: `name`, `state`, `stateCode`, `lat`, `lng`, `searchTokens`.
8. To make a user an admin, set `users/{uid}.isAdmin = true`.

## Data Model (Key Collections)
- `users/{uid}`: profile fields, counts, admin flags.
- `cities/{cityId}`: curated list of towns.
- `posts/{postId}`: town/state/national posts + reaction counts.
- `posts/{postId}/comments/{commentId}`: comment data.
- `posts/{postId}/reactions/{uid}`: one reaction per user.
- `groups/{groupId}`: group details.
- `groupJoinRequests/{requestId}`: join requests.
- `dmThreads/{threadId}` + `messages`: private DMs.
- `reports/{reportId}`: user reports for admin review.

## Tradeoffs & Scaling Notes
- **Trending** is computed client-side for transparency. For scale, move to Cloud Functions.
- **Town + nearby**: currently town/state/national only. For full nearby logic, add a geohash query or Cloud Function.
- **Admin actions** are UI-driven for MVP; production should add audit logs.
- **Counts** (likes/comments) are simple integers; large scale should use sharded counters.

## Deployment (GitHub Pages)
- Place the repo in a GitHub Pages branch (e.g., `main` or `gh-pages`).
- Make sure paths match `/html/index.html` as the start page.

