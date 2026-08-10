import type { NormalizedListing } from "@/lib/marketplaces";
import { formatCents } from "@/lib/money";
import { getEnv } from "@/lib/env";

const RESEND_URL = "https://api.resend.com/emails";

export function isEmailAlertsConfigured(): boolean {
  return Boolean(getEnv("RESEND_API_KEY") && getEnv("ALERT_EMAIL_FROM") && getEnv("ALERT_EMAIL_TO"));
}

export type AlertItem = { searchName: string; listing: NormalizedListing };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNewListingsAlert(items: AlertItem[]): Promise<void> {
  if (!isEmailAlertsConfigured() || items.length === 0) return;

  const rows = items
    .map(
      ({ searchName, listing }) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;">
            <a href="${escapeHtml(listing.url)}" style="color:#2a78d6;text-decoration:none;font-weight:600;">
              ${escapeHtml(listing.title)}
            </a>
            <div style="color:#898781;font-size:13px;margin-top:2px;">
              ${escapeHtml(searchName)} · ${escapeHtml(listing.marketplace)} · ${formatCents(listing.priceCents, listing.currency ?? "USD")}
            </div>
          </td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;">
      <h2 style="font-size:16px;">${items.length} new watch listing${items.length === 1 ? "" : "s"}</h2>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEnv("ALERT_EMAIL_FROM"),
      to: getEnv("ALERT_EMAIL_TO"),
      subject: `TreasureHunt: ${items.length} new watch listing${items.length === 1 ? "" : "s"}`,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send alert email: ${res.status} ${await res.text()}`);
  }
}
