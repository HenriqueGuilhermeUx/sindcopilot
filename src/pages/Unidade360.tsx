import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { listOccurrences, type OccurrenceListItem } from "@/lib/occurrences";
import { exportToPdf } from "@/lib/exportPdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Download,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  User,
  FileWarning,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";

type TimelineItem = {
  id: string;
  kind: "occurrence" | "notice";
  title: string;
  description: string;
  date: string;
  status: string;
};

function phoneDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function statusLabel(value: string) {
  const map: Record<string, string> = {
    open: "Aberta",
    under_review: "Em análise",
    notified: "Notificada",
    penalized: "Penalizada",
    resolved: "Resolvida",
    archived: "Arquivada",
    draft: "Rascunho",
    sent: "Enviada",
    cancelled: "Cancelada",
  };
  return map[value] || value;
}

export default function Unidade360() {
  const params = useParams<{ id: string; unitId: string }>();
  const condoId = Number(params.id || 0);
  const unitId = Number(params.unitId || 0);
  const [, setLocation] = useLocation();

  const { data: condo, isLoading: condoLoading } = trpc.condominium.get.useQuery(
    { id: condoId },
    { enabled: condoId > 0 },
  );
  const { data: unit, isLoading: unitLoading } = trpc.unit.get.useQuery(
    { id: unitId },
    { enabled: unitId > 0 },
  );
  const { data: notices } = trpc.notice.list.useQuery(
    { condominiumId: condoId },
    { enabled: condoId > 0 },
  );

  const [occurrences, setOccurrences] = useState<OccurrenceListItem[]>([]);
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);

  useEffect(() => {
    if (!condoId || !unitId) return;
    let active = true;
    setOccurrenceLoading(true);
    listOccurrences({ condominiumId: condoId })
      .then(result => {
        if (!active) return;
        setOccurrences(result.occurrences.filter(item => item.unitId === unitId));
      })
      .catch(error => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar as ocorrências.");
      })
      .finally(() => {
        if (active) setOccurrenceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [condoId, unitId]);

  const unitNotices = useMemo(
    () => (notices || []).filter((item: any) => Number(item.unitId) === unitId),
    [notices, unitId],
  );

  const timeline = useMemo<TimelineItem[]>(() => {
    const occurrenceItems = occurrences.map(item => ({
      id: `occ-${item.id}`,
      kind: "occurrence" as const,
      title: item.title,
      description: item.description,
      date: item.happenedAt || item.createdAt,
      status: item.status,
    }));
    const noticeItems = unitNotices.map((item: any) => ({
      id: `notice-${item.id}`,
      kind: "notice" as const,
      title: item.subject,
      description: item.description || item.generatedContent || "Minuta vinculada à unidade.",
      date: item.sentAt || item.createdAt,
      status: item.status,
    }));
    return [...occurrenceItems, ...noticeItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [occurrences, unitNotices]);

  const openOccurrences = occurrences.filter(item => !["resolved", "archived"].includes(item.status));
  const urgentOccurrences = openOccurrences.filter(item => item.severity === "urgent");
  const sentNotices = unitNotices.filter((item: any) => item.status === "sent");

  const primaryName = unit?.residentName || unit?.ownerName || "Sem contato principal";
  const primaryPhone = unit?.residentPhone || unit?.ownerPhone || null;
  const primaryEmail = unit?.residentEmail || unit?.ownerEmail || null;

  const exportPdf = () => {
    exportToPdf({
      title: `Unidade 360 - ${unit?.number || unitId}`,
      subtitle: `${condo?.name || "Condomínio"} · histórico operacional consolidado`,
      data: timeline.map(item => ({
        data: new Date(item.date).toLocaleDateString("pt-BR"),
        tipo: item.kind === "occurrence" ? "Ocorrência" : "Notificação",
        titulo: item.title,
        status: statusLabel(item.status),
      })),
      columns: [
        { key: "data", label: "Data", width: 28 },
        { key: "tipo", label: "Tipo", width: 32 },
        { key: "titulo", label: "Título", width: 85 },
        { key: "status", label: "Status", width: 35 },
      ],
      fileName: `unidade-${unit?.number || unitId}-360-${new Date().toISOString().split("T")[0]}.pdf`,
    });
    toast.success("Histórico da unidade exportado.");
  };

  if (condoLoading || unitLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="h-36 rounded bg-muted" />
      </div>
    );
  }

  if (!unit || Number(unit.condominiumId) !== condoId) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Unidade não encontrada neste condomínio.</p>
        <Button className="mt-4" variant="outline" onClick={() => setLocation(`/condominios/${condoId}`)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/condominios/${condoId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Unidade {unit.number}</h1>
              {unit.block && <Badge variant="outline">Bloco {unit.block}</Badge>}
              {unit.floor && <Badge variant="secondary">{unit.floor}º andar</Badge>}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" /> {condo?.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {primaryPhone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${primaryPhone}`}><Phone className="mr-2 h-4 w-4" />Ligar</a>
            </Button>
          )}
          {primaryEmail && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${primaryEmail}`}><Mail className="mr-2 h-4 w-4" />E-mail</a>
            </Button>
          )}
          {phoneDigits(primaryPhone).length >= 10 && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://wa.me/55${phoneDigits(primaryPhone)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!timeline.length}>
            <Download className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Contatos da unidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Morador</p>
              <p className="mt-2 font-semibold">{unit.residentName || "Não informado"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{unit.residentPhone || "Sem telefone"}</p>
              <p className="text-sm text-muted-foreground">{unit.residentEmail || "Sem e-mail"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proprietário</p>
              <p className="mt-2 font-semibold">{unit.ownerName || "Não informado"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{unit.ownerPhone || "Sem telefone"}</p>
              <p className="text-sm text-muted-foreground">{unit.ownerEmail || "Sem e-mail"}</p>
            </div>
            {unit.notes && (
              <div className="rounded-xl border p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observações</p>
                <p className="mt-2 text-sm">{unit.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ocorrências abertas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{openOccurrences.length}</span>
              {urgentOccurrences.length > 0 && <Badge variant="destructive">{urgentOccurrences.length} urgente(s)</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Comunicações enviadas</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sentNotices.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{unitNotices.length} registro(s) no total</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" />Linha do tempo da unidade</CardTitle>
        </CardHeader>
        <CardContent>
          {occurrenceLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando histórico…</div>
          ) : !timeline.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock3 className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Ainda não há ocorrências ou notificações vinculadas a esta unidade.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map(item => (
                <div key={item.id} className="flex gap-3 rounded-xl border p-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {item.kind === "occurrence" ? <ShieldAlert className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="outline">{item.kind === "occurrence" ? "Ocorrência" : "Notificação"}</Badge>
                      <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        A Unidade 360 consolida apenas vínculos reais já registrados no SindCopilot. Documentos e evidências sem vínculo explícito à unidade não são atribuídos automaticamente.
      </p>
    </div>
  );
}
