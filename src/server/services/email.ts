import { ENV } from "../core/env";

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!ENV.RESEND_API_KEY) {
    console.log("[Email skipped] RESEND_API_KEY ausente", params.to, params.subject);
    return { skipped: true };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ENV.RESEND_API_KEY}` },
    body: JSON.stringify({ from: ENV.EMAIL_FROM, to: [params.to], subject: params.subject, html: params.html }),
  });
  if (!response.ok) throw new Error(`Falha no email: ${response.status} ${await response.text()}`);
  return response.json();
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[ch]!));
}
