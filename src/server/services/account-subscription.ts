import { ENV } from "../core/env";

export async function cancelAccountSubscription(subscriptionId: string) {
  if (!subscriptionId) return { cancelled: false, reason: "missing_subscription" as const };
  if (!ENV.WOOVI_APP_ID) throw new Error("WOOVI_APP_ID não configurado para cancelar a assinatura");

  const baseUrl = ENV.WOOVI_API_URL.replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "PUT",
      headers: {
        Authorization: ENV.WOOVI_APP_ID,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const payload = JSON.parse(raw);
      message = payload?.errors?.[0]?.message || payload?.error || payload?.message || raw;
    } catch {
      // Mantém a resposta textual do provedor.
    }
    throw new Error(message || `Woovi respondeu ${response.status}`);
  }

  return { cancelled: true as const };
}
