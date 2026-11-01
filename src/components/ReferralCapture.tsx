import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/runtime";

const REF_KEY = "sindcopilot_partner_ref";
const VISITOR_KEY = "sindcopilot_partner_visitor";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

function visitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const value = globalThis.crypto?.randomUUID?.() || `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(VISITOR_KEY, value);
  return value;
}

export default function ReferralCapture() {
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("ref");
    const code = normalizeCode(incoming || localStorage.getItem(REF_KEY) || "");
    if (!code) return;

    localStorage.setItem(REF_KEY, code);

    fetch(apiUrl("/api/partners/track"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        visitorId: visitorId(),
        referrer: document.referrer || null,
      }),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    const code = normalizeCode(localStorage.getItem(REF_KEY) || "");
    if (!code) return;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(apiUrl("/api/partners/claim"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      }).catch(() => undefined);
    })();
  }, [user]);

  return null;
}

export const PARTNER_REFERRAL_STORAGE_KEY = REF_KEY;
