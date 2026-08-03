import { useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Grid3X3,
  Home,
  MessageSquare,
  Plus,
  User,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { impact } from "@/lib/runtime";

const mainItems = [
  { label: "Hoje", path: "/dashboard", icon: Home },
  { label: "Visitas", path: "/visitas", icon: ClipboardCheck },
  { label: "Pendências", path: "/compliance", icon: CalendarCheck },
] as const;

const quickActions = [
  { label: "Iniciar visita", detail: "Checklist, fotos e relatório", path: "/visitas", icon: ClipboardCheck },
  { label: "Fotografar documento", detail: "Nota fiscal, recibo ou contrato", path: "/documentos?captura=1", icon: FileText },
  { label: "Criar pendência", detail: "Prazo, responsável e alerta", path: "/compliance?nova=1", icon: CalendarCheck },
  { label: "Perguntar à IA", detail: "Convenção, regimento e rotina", path: "/assistente", icon: MessageSquare },
] as const;

const moreItems = [
  { label: "Condomínios", path: "/condominios", icon: Building2 },
  { label: "Documentos", path: "/documentos", icon: FileText },
  { label: "Notificações", path: "/notificacoes", icon: Bell },
  { label: "Fornecedores", path: "/fornecedores", icon: Users },
  { label: "Assistente IA", path: "/assistente", icon: MessageSquare },
  { label: "Meu perfil", path: "/perfil", icon: User },
] as const;

export default function MobileAppNav() {
  const [location, setLocation] = useLocation();
  const [panel, setPanel] = useState<"quick" | "more" | null>(null);

  const go = async (path: string) => {
    await impact();
    setPanel(null);
    setLocation(path);
  };

  const selected = (path: string) => location === path || location.startsWith(`${path}/`);

  return (
    <>
      {panel && (
        <div className="fixed inset-0 z-[70] flex items-end lg:hidden">
          <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setPanel(null)} />
          <section className="relative w-full rounded-t-[2rem] bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{panel === "quick" ? "Registrar agora" : "Mais ferramentas"}</p>
                <p className="text-sm text-muted-foreground">Tudo importante em poucos toques.</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-muted" onClick={() => setPanel(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={cn("grid gap-3", panel === "quick" ? "grid-cols-1" : "grid-cols-2")}>
              {(panel === "quick" ? quickActions : moreItems).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition active:scale-[.98]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">{item.label}</span>
                      {"detail" in item && <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid h-[72px] max-w-xl grid-cols-5 items-end">
          <button onClick={() => go(mainItems[0].path)} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px]", selected(mainItems[0].path) ? "font-bold text-blue-600" : "text-muted-foreground")}>
            <Home className="h-5 w-5" /> Hoje
          </button>
          <button onClick={() => go(mainItems[1].path)} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px]", selected(mainItems[1].path) ? "font-bold text-blue-600" : "text-muted-foreground")}>
            <ClipboardCheck className="h-5 w-5" /> Visitas
          </button>
          <button onClick={async () => { await impact(); setPanel("quick"); }} className="relative flex h-full flex-col items-center justify-end gap-1 pb-2 text-[11px] font-bold text-blue-700">
            <span className="absolute -top-5 grid h-14 w-14 place-items-center rounded-full border-4 border-background bg-blue-600 text-white shadow-xl shadow-blue-600/30">
              <Plus className="h-7 w-7" />
            </span>
            Registrar
          </button>
          <button onClick={() => go(mainItems[2].path)} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px]", selected(mainItems[2].path) ? "font-bold text-blue-600" : "text-muted-foreground")}>
            <CalendarCheck className="h-5 w-5" /> Pendências
          </button>
          <button onClick={async () => { await impact(); setPanel("more"); }} className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Grid3X3 className="h-5 w-5" /> Mais
          </button>
        </div>
      </nav>
    </>
  );
}
