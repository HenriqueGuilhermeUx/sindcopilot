import { useEffect } from "react";
import { useLocation } from "wouter";
import { Building2, CheckCircle2, ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function BrandMark() {
  return (
    <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-white text-slate-950 shadow-2xl shadow-blue-950/30">
      <Building2 className="h-8 w-8" strokeWidth={2.2} />
    </div>
  );
}

export default function NativeWelcome() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) setLocation("/dashboard", { replace: true });
  }, [loading, user, setLocation]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark />
          <div>
            <p className="text-xl font-semibold tracking-tight">SindCopilot</p>
            <p className="mt-1 text-sm text-slate-400">Preparando sua operação…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.28),transparent_62%)]" />
      <div className="pointer-events-none absolute -right-24 top-44 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      <div
        className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6"
        style={{
          paddingTop: "max(28px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <header className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-black/20">
            <Building2 className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">SindCopilot</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Gestão condominial</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <div className="mb-6">
              <BrandMark />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Seu centro de comando no celular
            </p>
            <h1 className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.04em]">
              O condomínio na palma da sua mão.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-slate-400">
              Vistorias, ocorrências e decisões organizadas em um app feito para a rotina do síndico.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-400">No dia a dia</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sincronizado
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.055] p-3.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Modo Visita</p>
                  <p className="mt-0.5 text-xs text-slate-500">Checklist, fotos, voz e relatório</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.055] p-3.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Ocorrências & Governança</p>
                  <p className="mt-0.5 text-xs text-slate-500">Evidências, histórico e dossiê</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-semibold shadow-xl shadow-blue-950/25"
            onClick={() => setLocation("/login")}
          >
            Entrar
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-full rounded-2xl border-white/15 bg-white/[0.04] text-base font-semibold text-white hover:bg-white/[0.09] hover:text-white"
            onClick={() => setLocation("/cadastro")}
          >
            Criar conta
          </Button>
          <p className="pt-2 text-center text-[11px] leading-4 text-slate-600">
            Acesso seguro · Mesmo login da plataforma SindCopilot
          </p>
        </section>
      </div>
    </main>
  );
}
