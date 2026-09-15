import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/lib/runtime";

function bridgeError(status: number, code?: string) {
  if (status === 401 || code === "unauthorized") return "Sua sessão expirou. Entre novamente no SindCopilot e tente de novo.";
  if (status === 503 || code === "nexoffice_not_configured" || code === "platform_bridge_not_configured") return "O NexOffice ainda não está configurado neste ambiente.";
  if (code === "workspace_access_revoked") return "Seu acesso ao workspace NexOffice foi revogado.";
  if (code === "onboarding_required") return "Seu acesso operacional ainda precisa ser concluído.";
  if (status >= 500) return "O NexOffice está temporariamente indisponível. Tente novamente em instantes.";
  return "Não foi possível abrir o NexOffice.";
}

export default function NexOfficeLauncher() {
  const { user, session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enabled = import.meta.env.VITE_NEXOFFICE_ENABLED === "true";

  // Primeiro rollout somente web. Evita handoff externo inesperado no app nativo.
  if (!enabled || isNativeApp || !user || !session?.access_token) return null;

  async function openNexOffice() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/nexoffice/handoff", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) {
        throw Object.assign(new Error("nexoffice_handoff_failed"), {
          status: response.status,
          code: payload?.error,
        });
      }
      window.location.assign(String(payload.url));
    } catch (cause: any) {
      setError(bridgeError(Number(cause?.status || 0), String(cause?.code || cause?.message || "")));
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-[70] flex max-w-[calc(100vw-2.5rem)] flex-col items-start gap-2">
      {error ? (
        <div className="max-w-xs rounded-xl border border-red-500/30 bg-slate-950/95 px-3 py-2 text-xs text-red-200 shadow-xl backdrop-blur">
          {error}
        </div>
      ) : null}
      <button
        type="button"
        onClick={openNexOffice}
        disabled={busy}
        className="group flex items-center gap-3 rounded-full border border-emerald-400/30 bg-slate-950/95 px-4 py-2.5 text-left text-white shadow-2xl backdrop-blur transition hover:border-emerald-300/60 hover:bg-slate-900 disabled:cursor-wait disabled:opacity-70"
        aria-label="Abrir NexOffice"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 font-black text-slate-950">N</span>
        <span>
          <strong className="block text-sm leading-tight">{busy ? "Abrindo NexOffice…" : "NexOffice"}</strong>
          <small className="block text-[10px] text-slate-400">Operação da administradora</small>
        </span>
        <span className="text-emerald-300 transition group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
}
