"use client";

import { useEffect, useRef, useState } from "react";
import {
  eventCalls,
  hasTrackers,
  vendorScripts,
  type TrackEvent,
  type Tracking as Config,
} from "@/lib/tracking";
import { captureOrigin } from "./attribution";

type Props = {
  slug: string;
  path: string;
  tracking: Config;
  /** Free <head> code set by the agency. */
  headScript: string;
  /** Side of the WhatsApp bubble, so the "Cookies" button takes the other. */
  bubbleSide?: "left" | "right" | null;
};

type Choice = "granted" | "denied" | null;

const counted = new Set<string>();
const consentKey = (slug: string) => `vitrine-consent:${slug}`;

function readChoice(slug: string): Choice {
  try {
    const v = window.localStorage.getItem(consentKey(slug));
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function run(code: string) {
  const s = document.createElement("script");
  s.text = code;
  document.head.appendChild(s);
}

function load(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Put the agency's HTML in <head>, re-creating scripts so the browser runs them. */
function injectHtml(html: string) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  for (const node of Array.from(tpl.content.childNodes)) {
    if (node instanceof HTMLScriptElement) {
      const s = document.createElement("script");
      for (const a of Array.from(node.attributes))
        s.setAttribute(a.name, a.value);
      s.text = node.text;
      document.head.appendChild(s);
    } else if (node.nodeType === 1) {
      document.head.appendChild(node);
    }
  }
}

function fire(config: Config, event: TrackEvent, label = "") {
  const w = window as unknown as Record<string, Record<string, unknown>>;
  for (const [fn, args] of eventCalls(config, event, label)) {
    const [obj, method] = fn.includes(".") ? fn.split(".") : [null, fn];
    const target = (obj ? w[obj] : w) as Record<string, unknown> | undefined;
    const f = target?.[method];
    if (typeof f === "function")
      (f as (...a: unknown[]) => void).apply(target, args);
  }
}

export function Tracking({
  slug,
  path,
  tracking,
  headScript,
  bubbleSide = null,
}: Props) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<Choice>(null);
  const [asking, setAsking] = useState(false);
  const loaded = useRef(false);

  const trackers = hasTrackers(tracking, headScript);
  const needsConsent = tracking.consent && trackers;
  const allowed = trackers && (!needsConsent || choice === "granted");

  // Visit counter (no cookies, no personal data) and the visitor's origin.
  useEffect(() => {
    const origin = captureOrigin();
    setChoice(readChoice(slug));
    setReady(true);
    const key = `${slug}:${path}`;
    if (tracking.views && !counted.has(key)) {
      counted.add(key);
      const body = JSON.stringify({ site: slug, path, origin });
      try {
        if (
          !navigator.sendBeacon?.(
            "/api/public/view",
            new Blob([body], { type: "application/json" })
          )
        )
          throw new Error("beacon refused");
      } catch {
        fetch("/api/public/view", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }
  }, [slug, path, tracking.views]);

  // Third-party code: only after consent (when required).
  useEffect(() => {
    if (!allowed || loaded.current) return;
    loaded.current = true;
    for (const v of vendorScripts(tracking)) {
      run(v.code);
      if (v.src) load(v.src);
    }
    if (headScript.trim()) injectHtml(headScript);
  }, [allowed, tracking, headScript]);

  // Conversions: contact form sent, main buttons clicked.
  useEffect(() => {
    if (!allowed) return;
    const onLead = () => fire(tracking, "lead");
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(
        "a.v-wa, a.v-btn, button.v-btn"
      );
      if (!el || el.matches('button[type="submit"]')) return;
      if (el.matches(".v-wa")) fire(tracking, "whatsapp");
      else fire(tracking, "cta", el.textContent?.trim() ?? "");
    };
    window.addEventListener("vitrine:lead", onLead);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("vitrine:lead", onLead);
      document.removeEventListener("click", onClick, true);
    };
  }, [allowed, tracking]);

  const decide = (next: Exclude<Choice, null>) => {
    try {
      window.localStorage.setItem(consentKey(slug), next);
    } catch {
      // blocked storage: the choice only lasts for this page view
    }
    setChoice(next);
    setAsking(false);
    // Code that already ran cannot be unloaded: reload to stop it.
    if (next === "denied" && loaded.current) window.location.reload();
  };

  const bannerOpen = ready && needsConsent && (choice === null || asking);
  useEffect(() => {
    document.body.classList.toggle("v-consent-open", bannerOpen);
    return () => document.body.classList.remove("v-consent-open");
  }, [bannerOpen]);

  if (!ready || !needsConsent) return null;
  if (choice !== null && !asking)
    return (
      <button
        type="button"
        className={`v-consent-link${bubbleSide === "left" ? " is-right" : ""}`}
        onClick={() => setAsking(true)}
      >
        Cookies
      </button>
    );
  return (
    <div className="v-consent" role="dialog" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para medir o desempenho do site e dos anúncios. Você
        escolhe se aceita.
      </p>
      <div className="v-consent-actions">
        <button type="button" onClick={() => decide("denied")}>
          Recusar
        </button>
        <button
          type="button"
          className="is-primary"
          onClick={() => decide("granted")}
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
