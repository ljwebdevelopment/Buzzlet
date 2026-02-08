/*
  Buzzlet Utility System
  - Provides small helper functions for DOM updates and formatting.
  - Keeps common logic in one place for beginner readability.
*/

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export const formatDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);

// Haversine formula for distance in miles.
export const distanceInMiles = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 3959; // miles
  const deltaLat = toRad(lat2 - lat1);
  const deltaLng = toRad(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const showNotice = (element, message, tone = "info") => {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("notice--success", "notice--danger");
  element.classList.remove("hidden");
  element.classList.add("visible");
  if (tone === "success") {
    element.classList.add("notice--success");
  }
  if (tone === "danger") {
    element.classList.add("notice--danger");
  }
};
