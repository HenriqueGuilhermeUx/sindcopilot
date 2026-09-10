import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Home as HomeIcon, FileText, CalendarCheck, AlertTriangle, Clock, ArrowRight, Sparkles, TrendingUp, ShieldCheck, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listOccurrences, type OccurrenceListItem } from "@/lib/occurrences";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: upcomingObl } = trpc.obligation.upcoming.useQuery({ days: 30 });
  const { data: activitiesData } = trpc.dashboard.activities.useQuery({ limit: 10 });
  const [occurrences, setOccurrences] = useState<OccurrenceListItem[]>([]);
  const [occurrenceStats, setOccurrenceStats] = useState({ total: 0, open: 0, urgent: 0, notified: 0, penalized: 0 });

  useEffect(() => {
    listOccurrences().then(result => {
      setOccurrences(result.occurrences);
      setOccurrenceStats(result.stats);
    }).catch(error => console.error("[Dashboard occurrences]", error));
  }, []);

  const priorityCases = occurrences.filter(item => !["resolved", "archived"].includes(item.status) && ["urgent", "high"].includes(item.severity)).slice(0, 4);
  const statCards = [
    { label: "Condomínios", value: stats?.totalCondominiums ?? 0, icon: Building2, color: "text-primary", bg: "bg-primary/10", path: "/condominios" },
    { label: "Unidades", value: stats?.totalUnits ?? 0, icon: HomeIcon, color: "text-chart-2", bg: "bg-chart-2/10", path: "/condominios" },
    { label: "Docs Pendentes", value: stats?.pendingDocuments ?? 0, icon: FileText, color: "text-chart-3", bg: "bg-chart-3/10", path: "/documentos" },
    { label: "Obrigações Próximas", value: stats?.upcomingObligations ?? 0, icon: CalendarCheck, color: "text-chart-4", bg: "bg-chart-4/10", path: "/compliance" },
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Hoje</h1><p className="text-sm text-muted-foreground">O que precisa da sua atenção em todos os condomínios.</p></div><Button onClick={() => setLocation("/ocorrencias")}><Plus className="mr-2 h-4 w-4" />Registrar ocorrência</Button></div>

    {(occurrenceStats.open > 0 || occurrenceStats.urgent > 0) && <Card className="border-0 bg-slate-950 text-white shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15"><ShieldCheck className="h-6 w-6 text-cyan-300" /></div><div className="flex-1"><p className="font-semibold">{occurrenceStats.open} ocorrência(s) em acompanhamento</p><p className="mt-1 text-sm text-slate-300">{occurrenceStats.urgent ? `${occurrenceStats.urgent} urgente(s) precisam de atenção.` : "Nenhuma ocorrência urgente agora."}</p></div><Button variant="secondary" onClick={() => setLocation("/ocorrencias")}>Abrir central <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>}

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{statCards.map(stat => <Card key={stat.label} className="cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md" onClick={() => setLocation(stat.path)}><CardContent className="p-4"><div className="mb-3 flex items-center justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>{statsLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{stat.value}</p>}<p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></CardContent></Card>)}</div>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-0 shadow-sm lg:col-span-1"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-4 w-4 text-cyan-700" />Casos prioritários</CardTitle><Button variant="ghost" size="sm" onClick={() => setLocation("/ocorrencias")}>Ver todos</Button></div></CardHeader><CardContent className="space-y-3">{!priorityCases.length ? <div className="py-8 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-10 w-10 opacity-30" /><p className="text-sm">Nenhum caso de alta prioridade.</p></div> : priorityCases.map(item => <button key={item.id} className="flex w-full items-center gap-3 rounded-lg bg-muted/50 p-3 text-left" onClick={() => setLocation("/ocorrencias")}><div className={`h-2.5 w-2.5 rounded-full ${item.severity === "urgent" ? "bg-rose-500" : "bg-orange-500"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">#{item.id} · {item.title}</p><p className="truncate text-xs text-muted-foreground">{item.condominiumName}{item.unitNumber ? ` · Un. ${item.unitNumber}` : ""}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></button>)}</CardContent></Card>

      <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Obrigações Próximas</CardTitle><Button variant="ghost" size="sm" onClick={() => setLocation("/compliance")}>Ver todas</Button></div></CardHeader><CardContent className="space-y-3">{!upcomingObl?.length ? <div className="py-8 text-center text-muted-foreground"><CalendarCheck className="mx-auto mb-2 h-10 w-10 opacity-30" /><p className="text-sm">Nenhuma obrigação próxima do vencimento</p></div> : upcomingObl.slice(0, 5).map(item => { const daysUntil = Math.ceil((new Date(item.obligation.dueDate).getTime() - Date.now()) / 86400000); const isOverdue = daysUntil < 0; const isUrgent = daysUntil <= 7 && daysUntil >= 0; return <div key={item.obligation.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"><div className={`h-2 w-2 rounded-full ${isOverdue ? "bg-destructive" : isUrgent ? "bg-warning" : "bg-success"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.obligation.title}</p><p className="text-xs text-muted-foreground">{item.condominiumName}</p></div><Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">{isOverdue ? `${Math.abs(daysUntil)}d atrasado` : `${daysUntil}d`}</Badge></div>; })}</CardContent></Card>

      <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base font-semibold"><Clock className="h-4 w-4 text-muted-foreground" />Atividade Recente</CardTitle></CardHeader><CardContent className="space-y-3">{!activitiesData?.length ? <div className="py-8 text-center text-muted-foreground"><TrendingUp className="mx-auto mb-2 h-10 w-10 opacity-30" /><p className="text-sm">Nenhuma atividade registrada ainda</p></div> : activitiesData.slice(0, 6).map(item => <div key={item.activity.id} className="flex items-start gap-3 p-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Sparkles className="h-3.5 w-3.5 text-primary" /></div><div className="flex-1"><p className="truncate text-sm">{item.activity.title}</p><div className="mt-0.5 flex items-center gap-2">{item.condominiumName && <span className="text-xs text-muted-foreground">{item.condominiumName}</span>}<span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.activity.createdAt), { addSuffix: true, locale: ptBR })}</span></div></div></div>)}</CardContent></Card>
    </div>

    <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[[ShieldCheck, "Registrar Ocorrência", "/ocorrencias"], [Building2, "Novo Condomínio", "/condominios"], [FileText, "Upload Documento", "/documentos"], [AlertTriangle, "Gerar Notificação", "/notificacoes"], [Sparkles, "Consultar IA", "/assistente"]].map(([Icon, label, path]: any) => <Button key={label} variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setLocation(path)}><Icon className="h-5 w-5 text-primary" /><span className="text-xs">{label}</span></Button>)}</div></CardContent></Card>
  </div>;
}
