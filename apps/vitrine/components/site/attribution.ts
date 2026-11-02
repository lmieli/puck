// Where the visitor came from (UTM tags, ad click ids, referrer), kept for the
// browser tab only (sessionStorage) so a contact form sent later can say which
// campaign brought the person. Nothing here identifies anyone.

import { sanitizeOrigin, type Origin } from "@/lib/tracking";

const KEY = "vitrine-origin";
const PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ttclid",
];

function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Called on every page load: remembers the first visit of the tab, or a newer campaign. */
export function captureOrigin(): Origin {
  const s = store();
  let saved: Origin = {};
  try {
    saved = sanitizeOrigin(JSON.parse(s?.getItem(KEY) || "{}"));
  } catch {
    // ignore corrupt value
  }
  const url = new URLSearchParams(window.location.search);
  const fromUrl: Record<string, string> = {};
  for (const k of PARAMS) {
    const v = url.get(k);
    if (v) fromUrl[k] = v;
  }
  let next = saved;
  if (Object.keys(fromUrl).length) {
    next = sanitizeOrigin({
      ...fromUrl,
      referrer: document.referrer,
      landing: window.location.pathname,
    });
  } else if (!Object.keys(saved).length) {
    next = sanitizeOrigin({
      referrer: document.referrer,
      landing: window.location.pathname,
    });
  }
  try {
    s?.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: the origin just isn't kept
  }
  return next;
}

export function readOrigin(): Origin {
  try {
    return sanitizeOrigin(JSON.parse(store()?.getItem(KEY) || "{}"));
  } catch {
    return {};
  }
}
