import "server-only";
import { db } from "./db";

// Optional hosting integrations for customer domains. With VERCEL_TOKEN and
// VERCEL_PROJECT_ID set, domains are attached to the Vercel project, which
// issues and renews their HTTPS certificates. For a self-hosted server, Caddy's
// on-demand TLS asks /api/tls/check before issuing a certificate.

const vercel = () =>
  process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID
    ? {
        token: process.env.VERCEL_TOKEN,
        project: process.env.VERCEL_PROJECT_ID,
        team: process.env.VERCEL_TEAM_ID,
      }
    : null;

export const hostingProvider = () => (vercel() ? "vercel" : "self");

function url(path: string) {
  const v = vercel()!;
  return `https://api.vercel.com${path}${
    v.team ? `?teamId=${encodeURIComponent(v.team)}` : ""
  }`;
}

async function call(method: string, path: string, body?: unknown) {
  const v = vercel();
  if (!v) return null;
  const res = await fetch(url(path), {
    method,
    headers: {
      authorization: `Bearer ${v.token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404 && res.status !== 409) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Hospedagem recusou (${res.status}): ${text.slice(0, 200)}`
    );
  }
  return res;
}

export async function attachDomain(host: string) {
  try {
    await call("POST", `/v10/projects/${vercel()?.project}/domains`, {
      name: host,
    });
  } catch (e) {
    db()
      .prepare("UPDATE domains SET last_error = ? WHERE host = ?")
      .run((e as Error).message, host);
  }
}

export async function detachDomain(host: string) {
  try {
    await call(
      "DELETE",
      `/v9/projects/${vercel()?.project}/domains/${encodeURIComponent(host)}`
    );
  } catch (e) {
    console.error(e);
  }
}
