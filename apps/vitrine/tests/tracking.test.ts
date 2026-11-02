// Tracking by ID: validation, the official snippets (run in a fake browser to
// see exactly what they do), events, visitor origin and the visit summary.

import assert from "node:assert/strict";
import vm from "node:vm";
import { test } from "node:test";
import {
  EMPTY_TRACKING,
  eventCalls,
  hasTrackers,
  isBot,
  parseTracking,
  sanitizeOrigin,
  sourceLabel,
  summarizeViews,
  validateTracking,
  vendorScripts,
  type Tracking,
} from "../lib/tracking.ts";

const ok = (input: Record<string, unknown>) => {
  const r = validateTracking(input);
  assert.ok("value" in r, "error" in r ? r.error : "");
  return r.value;
};
const bad = (input: Record<string, unknown>) => {
  const r = validateTracking(input);
  assert.ok("error" in r, "should have been rejected");
  return r.error;
};
const tracking = (o: Partial<Tracking>): Tracking => ({
  ...EMPTY_TRACKING,
  ...o,
});

test("valid IDs are accepted and normalised", () => {
  const t = ok({
    metaPixel: " 123456789012345 ",
    ga4: "g-abc123xyz9",
    googleAds: "aw-123456789",
    googleAdsLeadLabel: "AbC-dEfGhIjK",
    tiktok: "c1a2b3c4d5e6f7g8h9i0",
    pinterest: "2612345678901",
    consent: "on",
  });
  assert.equal(t.metaPixel, "123456789012345");
  assert.equal(t.ga4, "G-ABC123XYZ9");
  assert.equal(t.googleAds, "AW-123456789");
  assert.equal(t.tiktok, "C1A2B3C4D5E6F7G8H9I0");
  assert.equal(t.consent, true);
  assert.equal(t.views, false, "an unchecked box means off");
});

test("an empty form clears everything", () => {
  const t = ok({});
  assert.deepEqual(
    { ...t, consent: undefined, views: undefined },
    { ...EMPTY_TRACKING, consent: undefined, views: undefined }
  );
});

test("code, URLs and wrong formats are rejected with a helpful message", () => {
  assert.match(
    bad({ metaPixel: "<script>alert(1)</script>" }),
    /Meta Pixel.*formato inválido/
  );
  assert.match(
    bad({ metaPixel: "12345" }),
    /123456789012345/,
    "shows an example"
  );
  assert.match(bad({ metaPixel: "1234567890'); alert(1);//" }), /Meta Pixel/);
  assert.match(bad({ ga4: "UA-12345-1" }), /Google Analytics/);
  assert.match(
    bad({ ga4: "https://analytics.google.com" }),
    /Google Analytics/
  );
  assert.match(bad({ googleAds: "123456789" }), /Google Ads/);
  assert.match(bad({ tiktok: "abc" }), /TikTok/);
  assert.match(bad({ pinterest: "abc" }), /Pinterest/);
  assert.match(bad({ googleVerification: "a b" }), /Search Console/);
  assert.match(
    bad({ googleAdsLeadLabel: "AbC-dEfGhIjK" }),
    /junto com o ID do Google Ads/
  );
});

test("stored values that are corrupt or no longer valid are dropped, not trusted", () => {
  assert.deepEqual(parseTracking("not json"), EMPTY_TRACKING);
  assert.deepEqual(parseTracking(""), EMPTY_TRACKING);
  const t = parseTracking(
    JSON.stringify({
      metaPixel: "123456789012345",
      ga4: "'); evil();//",
      consent: false,
    })
  );
  assert.equal(t.metaPixel, "123456789012345");
  assert.equal(t.ga4, "", "invalid value is discarded");
  assert.equal(t.consent, false);
  assert.equal(t.views, true, "defaults apply to missing flags");
});

test("hasTrackers tells whether consent is needed", () => {
  assert.equal(hasTrackers(EMPTY_TRACKING), false);
  assert.equal(hasTrackers(tracking({ metaPixel: "123456789012345" })), true);
  assert.equal(hasTrackers(EMPTY_TRACKING, "<script></script>"), true);
  assert.equal(
    hasTrackers(tracking({ googleVerification: "a".repeat(30) })),
    false,
    "verification tags are not trackers"
  );
});

/** Arrays made inside the fake browser have another prototype: compare plain data. */
const plain = <T>(v: unknown) => JSON.parse(JSON.stringify(v)) as T;

/** Run a snippet in a fake browser and return what it left behind. */
function runInBrowser(code: string, src?: string) {
  const appended: { src?: string }[] = [];
  const win: Record<string, any> = {};
  const document = {
    createElement: () => ({}),
    getElementsByTagName: () => [
      {
        parentNode: {
          insertBefore: (el: { src?: string }) => appended.push(el),
        },
      },
    ],
  };
  win.window = win;
  win.document = document;
  win.Date = Date;
  vm.runInNewContext(code, win);
  void src;
  return { win, appended };
}

test("Meta Pixel snippet: loads the official library and queues init + PageView", () => {
  const [v] = vendorScripts(tracking({ metaPixel: "123456789012345" }));
  const { win, appended } = runInBrowser(v.code);
  assert.deepEqual(
    plain(win.fbq.queue.map((a: ArrayLike<unknown>) => Array.from(a))),
    [
      ["init", "123456789012345"],
      ["track", "PageView"],
    ]
  );
  assert.equal(
    appended[0].src,
    "https://connect.facebook.net/en_US/fbevents.js"
  );
});

test("Google snippet: one library for Analytics and Ads, both configured", () => {
  const vendors = vendorScripts(
    tracking({ ga4: "G-ABC123XYZ9", googleAds: "AW-123456789" })
  );
  assert.equal(vendors.length, 1);
  assert.equal(
    vendors[0].src,
    "https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9"
  );
  const { win } = runInBrowser(vendors[0].code);
  const calls = plain<unknown[][]>(
    win.dataLayer.map((a: ArrayLike<unknown>) => Array.from(a))
  );
  assert.deepEqual(calls.slice(1), [
    ["config", "G-ABC123XYZ9"],
    ["config", "AW-123456789"],
  ]);
  assert.equal(calls[0][0], "js");
});

test("TikTok and Pinterest snippets load their official libraries and register the ID", () => {
  const [tt] = vendorScripts(tracking({ tiktok: "C1A2B3C4D5E6F7G8H9I0" }));
  const a = runInBrowser(tt.code);
  assert.equal(a.win.TiktokAnalyticsObject, "ttq");
  assert.match(
    a.appended[0].src!,
    /^https:\/\/analytics\.tiktok\.com\/i18n\/pixel\/events\.js\?sdkid=C1A2B3C4D5E6F7G8H9I0&lib=ttq$/
  );
  assert.deepEqual(plain(a.win.ttq.map((x: unknown[]) => x[0])), ["page"]);

  const [pin] = vendorScripts(tracking({ pinterest: "2612345678901" }));
  const b = runInBrowser(pin.code);
  assert.equal(b.appended[0].src, "https://s.pinimg.com/ct/core.js");
  assert.deepEqual(plain(b.win.pintrk.queue), [
    ["load", "2612345678901"],
    ["page"],
  ]);
});

test("a hostile value can never break out of the snippet, even if validation were skipped", () => {
  const evil = `1");globalThis.pwned=1;("`;
  for (const field of [
    "metaPixel",
    "tiktok",
    "pinterest",
    "ga4",
    "googleAds",
  ] as const) {
    for (const v of vendorScripts(tracking({ [field]: evil }))) {
      const { win } = runInBrowser(v.code);
      assert.equal(win.pwned, undefined, `${field} must stay inside a string`);
    }
  }
});

test("nothing configured means no third-party code at all", () => {
  assert.deepEqual(vendorScripts(EMPTY_TRACKING), []);
  assert.deepEqual(eventCalls(EMPTY_TRACKING, "lead"), []);
  assert.deepEqual(
    vendorScripts(
      tracking({ googleVerification: "a".repeat(30), consent: false })
    ),
    []
  );
});

test("a contact form submission becomes the right conversion on each platform", () => {
  const t = tracking({
    metaPixel: "123456789012345",
    ga4: "G-ABC123XYZ9",
    googleAds: "AW-123456789",
    googleAdsLeadLabel: "AbC-dEfGhIjK",
    tiktok: "C1A2B3C4D5E6F7G8H9I0",
    pinterest: "2612345678901",
  });
  assert.deepEqual(eventCalls(t, "lead"), [
    ["fbq", ["track", "Lead"]],
    ["gtag", ["event", "generate_lead"]],
    ["gtag", ["event", "conversion", { send_to: "AW-123456789/AbC-dEfGhIjK" }]],
    ["ttq.track", ["SubmitForm"]],
    ["pintrk", ["track", "lead"]],
  ]);
  // Only the platforms that are configured get calls.
  assert.deepEqual(
    eventCalls(tracking({ metaPixel: "123456789012345" }), "lead"),
    [["fbq", ["track", "Lead"]]]
  );
  // The Ads conversion needs its label.
  assert.equal(
    eventCalls(tracking({ googleAds: "AW-123456789" }), "lead").some(
      ([, a]) => a[1] === "conversion"
    ),
    false
  );
});

test("button clicks carry a short label", () => {
  const calls = eventCalls(
    tracking({ ga4: "G-ABC123XYZ9" }),
    "cta",
    "x".repeat(200)
  );
  assert.deepEqual(calls[0][0], "gtag");
  assert.equal((calls[0][1][2] as { label: string }).label.length, 60);
});

test("visitor origin keeps only known keys, as short clean strings", () => {
  const o = sanitizeOrigin({
    utm_source: "google",
    utm_medium: "cpc",
    referrer: "https://www.google.com/",
    evil: "<script>",
    utm_campaign: "x".repeat(500),
    gclid: 42,
    landing: "/?a=1\u0000\u0007b",
  });
  assert.deepEqual(Object.keys(o).sort(), [
    "landing",
    "referrer",
    "utm_campaign",
    "utm_medium",
    "utm_source",
  ]);
  assert.equal(o.utm_campaign!.length, 200);
  assert.equal(o.landing, "/?a=1b");
  assert.deepEqual(sanitizeOrigin(null), {});
  assert.deepEqual(sanitizeOrigin("x"), {});
});

test("sources read like a person would say them", () => {
  assert.equal(
    sourceLabel({ utm_source: "google", utm_medium: "cpc" }),
    "google / cpc"
  );
  assert.equal(sourceLabel({ utm_source: "newsletter" }), "newsletter");
  assert.equal(sourceLabel({ gclid: "abc" }), "google / cpc");
  assert.equal(sourceLabel({ fbclid: "abc" }), "facebook / social");
  assert.equal(
    sourceLabel({ referrer: "https://www.instagram.com/p/x" }),
    "instagram.com"
  );
  assert.equal(
    sourceLabel({ referrer: "https://meusite.com/outra" }, ["meusite.com"]),
    "direto"
  );
  assert.equal(sourceLabel({ referrer: "not a url" }), "direto");
  assert.equal(sourceLabel({}), "direto");
});

test("crawlers and empty user agents are not counted as visits", () => {
  assert.equal(
    isBot("Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36"),
    false
  );
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot("facebookexternalhit/1.1"), true);
  assert.equal(isBot("HeadlessChrome/126"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot(null), true);
});

test("the visit summary fills empty days and ranks pages and sources", () => {
  const days = ["2026-11-01", "2026-11-02", "2026-11-03"];
  const s = summarizeViews(
    [
      { day: "2026-11-01", path: "/", source: "direto", views: 3 },
      { day: "2026-11-01", path: "/contato", source: "google / cpc", views: 1 },
      { day: "2026-11-03", path: "/", source: "google / cpc", views: 5 },
      { day: "2026-10-01", path: "/velho", source: "direto", views: 99 }, // outside the window
    ],
    days
  );
  assert.equal(s.total, 9);
  assert.deepEqual(s.perDay, [
    { day: "2026-11-01", views: 4 },
    { day: "2026-11-02", views: 0 },
    { day: "2026-11-03", views: 5 },
  ]);
  assert.deepEqual(s.pages, [
    { name: "/", views: 8 },
    { name: "/contato", views: 1 },
  ]);
  assert.deepEqual(s.sources[0], { name: "google / cpc", views: 6 });
});
