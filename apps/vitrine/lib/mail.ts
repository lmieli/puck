import "server-only";

// Transactional e-mail through Resend's HTTP API. Without RESEND_API_KEY and
// VITRINE_MAIL_FROM, nothing is sent and callers show the link on screen.

export const mailConfigured = () =>
  !!(process.env.RESEND_API_KEY && process.env.VITRINE_MAIL_FROM);

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.VITRINE_MAIL_FROM,
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error("mail failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export function appUrl(path: string) {
  const base = (process.env.VITRINE_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}${path}`;
}
