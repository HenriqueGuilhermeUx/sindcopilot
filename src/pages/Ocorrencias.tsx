import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  History,
  Loader2,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addOccurrenceEvent,
  addOccurrenceEvidence,
  checkOccurrenceConsistency,
  createOccurrence,
  deleteOccurrenceEvidence,
  fileToBase64,
  generateOccurrenceNotice,
  getOccurrenceDetail,
  getRuleSuggestions,
  listOccurrences,
  markOccurrenceNoticeSent,
  updateOccurrence,
  type EvidenceKind,
  type NoticeType,
  type OccurrenceCategory,
  type OccurrenceDetail,
  type OccurrenceListItem,
  type OccurrenceSeverity,
} from "@/lib/occurrences";
import { generateOccurrenceReport } from "@/lib/occurrence-report";

const CATEGORY_LABEL: Record<OccurrenceCategory, string> = {
  barulho: "Barulho",
  obra: "Obra",
  pet: "Animais",
  garagem: "Garagem",
  area_comum: "Área comum",
  convivencia: "Convivência",
  seguranca: "Segurança",
  dano: "Dano ao patrimônio",
  financeiro: "Financeiro",
  outro: "Outro",
};

const SEVERITY_LABEL: Record<OccurrenceSeverity, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
const STATUS_LABEL: Record<string, string> = { open: "Aberta", under_review: "Em análise", notified: "Notificada", penalized: "Penalizada", resolved: "Resolvida", archived: "Arquivada" };
const NOTICE_LABEL: Record<NoticeType, string> = { notificacao: "Notificação", advertencia: "Advertência", multa: "Multa" };

function formatDate(value?: string | null, withTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...(withTime ? { timeStyle: "short" as const } : {}) }).format(date);
}

function severityClass(severity: string) {
  if (severity === "urgent") return "bg-rose-100 text-rose-700 border-rose-200";
  if (severity === "high") return "bg-orange-100 text-orange-700 border-orange-200";
  if (severity === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "penalized") return "bg-violet-100 text-violet-700 border-violet-200";
  if (status === "notified") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "under_review") return "bg-cyan-100 text-cyan-700 border-cyan-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function inferEvidenceKind(file?: File | null): EvidenceKind {
  if (!file) return "testimony";
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type === "application/pdf") return "document";
  return "other";
}

export default function Ocorrencias() {
  const { data: condos } = trpc.condominium.list.useQuery();
  const [items, setItems] = useState<OccurrenceListItem[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, urgent: 0, notified: 0, penalized: 0 });
  const [loading, setLoading] = useState(true);
  const [filterCondo, setFilterCondo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [selectedCondoId, setSelectedCondoId] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState("none");
  const [category, setCategory] = useState<OccurrenceCategory>("convivencia");
  const [severity, setSeverity] = useState<OccurrenceSeverity>("medium");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OccurrenceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState<"note" | "defense_received" | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleSuggestions, setRuleSuggestions] = useState<Array<{ documentId: number; title: string; pageNumber: number | null; excerpt: string; source: number }>>([]);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [consistency, setConsistency] = useState<Awaited<ReturnType<typeof checkOccurrenceConsistency>> | null>(null);
  const [consistencyOpen, setConsistencyOpen] = useState(false);
  const [plannedAction, setPlannedAction] = useState<NoticeType>("advertencia");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeType, setNoticeType] = useState<NoticeType>("advertencia");
  const [actionLoading, setActionLoading] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: units } = trpc.unit.list.useQuery(
    { condominiumId: selectedCondoId || 0 },
    { enabled: selectedCondoId > 0 },
  );

  async function refresh() {
    setLoading(true);
    try {
      const result = await listOccurrences({
        condominiumId: filterCondo === "all" ? null : Number(filterCondo),
        status: filterStatus,
        search: search.trim() || undefined,
      });
      setItems(result.occurrences);
      setStats(result.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as ocorrências.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDetail(id = selectedId) {
    if (!id) return;
    setDetailLoading(true);
    try {
      setDetail(await getOccurrenceDetail(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o caso.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [filterCondo, filterStatus]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    void refreshDetail(selectedId);
  }, [selectedId]);

  const selectedCondoName = useMemo(() => (condos || []).find((condo: any) => Number(condo.id) === selectedCondoId)?.name || "", [condos, selectedCondoId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!selectedCondoId) return toast.error("Selecione o condomínio.");
    setCreating(true);
    try {
      const happened = String(form.get("happenedAt") || "");
      const result = await createOccurrence({
        condominiumId: selectedCondoId,
        unitId: selectedUnitId === "none" ? null : Number(selectedUnitId),
        title: String(form.get("title") || ""),
        description: String(form.get("description") || ""),
        category,
        severity,
        happenedAt: happened ? new Date(happened).toISOString() : undefined,
        location: String(form.get("location") || "") || null,
        reportedBy: String(form.get("reportedBy") || "") || null,
        reportedChannel: String(form.get("reportedChannel") || "manual") as any,
      });
      toast.success(`Ocorrência #${result.id} registrada.`);
      setNewOpen(false);
      setSelectedId(result.id);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a ocorrência.");
    } finally {
      setCreating(false);
    }
  }

  async function handleEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    const file = fileRef.current?.files?.[0] || null;
    const description = String(form.get("description") || "").trim();
    const witnessName = String(form.get("witnessName") || "").trim();
    if (!file && !description) return toast.error("Adicione um arquivo ou descreva o relato/testemunho.");
    if (file && file.size > 25 * 1024 * 1024) return toast.error("A evidência deve ter no máximo 25 MB.");
    setActionLoading(true);
    try {
      await addOccurrenceEvidence(selectedId, {
        kind: inferEvidenceKind(file),
        description: description || null,
        witnessName: witnessName || null,
        capturedAt: new Date().toISOString(),
        ...(file ? { fileBase64: await fileToBase64(file), fileName: file.name, mimeType: file.type } : {}),
      });
      toast.success(file ? "Evidência anexada e integridade registrada." : "Relato/testemunho registrado.");
      setEvidenceOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      await Promise.all([refreshDetail(), refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar a evidência.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !eventOpen) return;
    const form = new FormData(event.currentTarget);
    setActionLoading(true);
    try {
      await addOccurrenceEvent(selectedId, {
        type: eventOpen,
        title: eventOpen === "defense_received" ? "Manifestação do morador" : String(form.get("title") || "Registro interno"),
        description: String(form.get("description") || ""),
      });
      toast.success(eventOpen === "defense_received" ? "Manifestação registrada na linha do tempo." : "Registro adicionado.");
      setEventOpen(null);
      await Promise.all([refreshDetail(), refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o registro.");
    } finally {
      setActionLoading(false);
    }
  }

  async function loadRules() {
    if (!selectedId) return;
    setRuleOpen(true);
    setRuleLoading(true);
    try {
      const result = await getRuleSuggestions(selectedId);
      setRuleSuggestions(result.suggestions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar as regras indexadas.");
    } finally {
      setRuleLoading(false);
    }
  }

  async function linkRule(rule: { documentId: number; title: string; pageNumber: number | null; excerpt: string }) {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await updateOccurrence(selectedId, {
        ruleDocumentId: rule.documentId,
        rulePage: rule.pageNumber,
        ruleReference: `${rule.title}${rule.pageNumber ? ` — página ${rule.pageNumber}` : ""}`,
        ruleExcerpt: rule.excerpt,
      });
      toast.success("Regra vinculada ao caso.");
      setRuleOpen(false);
      await refreshDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível vincular a regra.");
    } finally {
      setActionLoading(false);
    }
  }

  async function runConsistency() {
    if (!selectedId) return;
    setConsistencyOpen(true);
    setActionLoading(true);
    try {
      setConsistency(await checkOccurrenceConsistency(selectedId, plannedAction));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível verificar a consistência.");
    } finally {
      setActionLoading(false);
    }
  }

  async function makeNotice() {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const result = await generateOccurrenceNotice(selectedId, noticeType);
      toast.success(`${NOTICE_LABEL[noticeType]} criada como minuta para revisão.`);
      if (result.warning) toast.warning(result.warning);
      setNoticeOpen(false);
      await Promise.all([refreshDetail(), refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a minuta.");
    } finally {
      setActionLoading(false);
    }
  }

  async function markSent(noticeId: number) {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await markOccurrenceNoticeSent(selectedId, noticeId);
      toast.success("Envio/aplicação registrado na linha do tempo.");
      await Promise.all([refreshDetail(), refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a comunicação.");
    } finally {
      setActionLoading(false);
    }
  }

  async function resolveCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    setActionLoading(true);
    try {
      await updateOccurrence(selectedId, { status: "resolved", resolution: String(form.get("resolution") || "") });
      toast.success("Caso encerrado e desfecho registrado.");
      setResolveOpen(false);
      await Promise.all([refreshDetail(), refresh()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar o caso.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-cyan-700" /><h1 className="text-2xl font-bold tracking-tight">Ocorrências</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Fatos, evidências, regras, manifestações, comunicações e histórico em uma única linha do tempo.</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova ocorrência</Button></DialogTrigger>
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar ocorrência</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Condomínio *</Label><Select value={selectedCondoId ? String(selectedCondoId) : ""} onValueChange={value => { setSelectedCondoId(Number(value)); setSelectedUnitId("none"); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(condos || []).map((condo: any) => <SelectItem key={condo.id} value={String(condo.id)}>{condo.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Unidade</Label><Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!selectedCondoId}><SelectTrigger><SelectValue placeholder="Área comum / sem unidade" /></SelectTrigger><SelectContent><SelectItem value="none">Área comum / sem unidade</SelectItem>{(units || []).map((unit: any) => <SelectItem key={unit.id} value={String(unit.id)}>Unidade {unit.number}{unit.block ? ` — Bloco ${unit.block}` : ""}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" name="title" placeholder="Ex: Barulho excessivo após o horário permitido" required /></div>
              <div className="space-y-2"><Label htmlFor="description">O que aconteceu? *</Label><Textarea id="description" name="description" rows={4} placeholder="Registre somente fatos observados ou relatados, com o máximo de objetividade." required /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Categoria</Label><Select value={category} onValueChange={value => setCategory(value as OccurrenceCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Gravidade</Label><Select value={severity} onValueChange={value => setSeverity(value as OccurrenceSeverity)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SEVERITY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="happenedAt">Data/hora do fato</Label><Input id="happenedAt" name="happenedAt" type="datetime-local" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="location">Local</Label><Input id="location" name="location" placeholder="Garagem, salão..." /></div>
                <div className="space-y-2"><Label htmlFor="reportedBy">Relatado por</Label><Input id="reportedBy" name="reportedBy" placeholder="Porteiro, morador..." /></div>
                <div className="space-y-2"><Label>Canal</Label><Select name="reportedChannel" defaultValue="manual"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Registro direto</SelectItem><SelectItem value="portaria">Portaria</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent></Select></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Condomínio selecionado: <strong>{selectedCondoName || "—"}</strong>. Depois de salvar, você poderá anexar provas, consultar regras e registrar manifestações.</div>
              <Button className="w-full" disabled={creating || !selectedCondoId}>{creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Registrar ocorrência"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Total", stats.total, ClipboardList], ["Abertas", stats.open, History], ["Urgentes", stats.urgent, AlertTriangle], ["Notificadas", stats.notified, Send], ["Penalizadas", stats.penalized, Gavel],
        ].map(([label, value, Icon]: any) => <Card key={label} className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-cyan-700" /></div><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>)}
      </div>

      <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px_190px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por assunto ou descrição..." value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void refresh(); }} /></div><Select value={filterCondo} onValueChange={setFilterCondo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os condomínios</SelectItem>{(condos || []).map((condo: any) => <SelectItem key={condo.id} value={String(condo.id)}>{condo.name}</SelectItem>)}</SelectContent></Select><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div></CardContent></Card>

      {loading ? <div className="grid gap-3">{[1, 2, 3].map(value => <Card key={value} className="h-28 animate-pulse border-0 bg-muted/50" />)}</div> : !items.length ? <Card className="border-dashed"><CardContent className="py-16 text-center"><ShieldCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="font-semibold">Nenhuma ocorrência encontrada</p><p className="mt-1 text-sm text-muted-foreground">Registre o primeiro caso ou ajuste os filtros.</p></CardContent></Card> : <div className="grid gap-3">{items.map(item => (
        <Card key={item.id} className="cursor-pointer border-0 shadow-sm transition hover:shadow-md" onClick={() => setSelectedId(item.id)}><CardContent className="p-4 sm:p-5"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">#{item.id} · {item.title}</p><Badge variant="outline" className={severityClass(item.severity)}>{SEVERITY_LABEL[item.severity]}</Badge><Badge variant="outline" className={statusClass(item.status)}>{STATUS_LABEL[item.status]}</Badge>{item.recurrenceCount > 0 && <Badge variant="secondary">{item.recurrenceCount} anterior(es)</Badge>}</div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{item.condominiumName}</span>{item.unitNumber && <span>Unidade {item.unitNumber}{item.unitBlock ? ` · Bloco ${item.unitBlock}` : ""}</span>}<span>{CATEGORY_LABEL[item.category]}</span><span>{formatDate(item.happenedAt)}</span><span>{item.evidenceCount} evidência(s)</span><span>{item.noticeCount} comunicação(ões)</span></div></div><ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" /></div></CardContent></Card>
      ))}</div>}

      <Dialog open={!!selectedId} onOpenChange={open => { if (!open) { setSelectedId(null); setDetail(null); } }}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto p-0">
          {detailLoading || !detail ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-700" /></div> : <div>
            <div className="border-b bg-slate-950 p-5 text-white sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-cyan-200">CASO #{detail.occurrence.id}</span><Badge variant="outline" className="border-white/20 bg-white/10 text-white">{STATUS_LABEL[detail.occurrence.status]}</Badge></div><h2 className="mt-2 text-xl font-bold sm:text-2xl">{detail.occurrence.title}</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">{detail.occurrence.condominiumName}{detail.occurrence.unitNumber ? ` · Unidade ${detail.occurrence.unitNumber}${detail.occurrence.unitBlock ? ` / Bloco ${detail.occurrence.unitBlock}` : ""}` : " · Área comum"}</p></div><Button variant="secondary" size="sm" onClick={() => generateOccurrenceReport(detail)}><Download className="mr-2 h-4 w-4" />Dossiê PDF</Button></div></div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Data do fato</p><p className="mt-1 text-sm font-semibold">{formatDate(detail.occurrence.happenedAt)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categoria</p><p className="mt-1 text-sm font-semibold">{CATEGORY_LABEL[detail.occurrence.category]}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gravidade</p><p className="mt-1 text-sm font-semibold">{SEVERITY_LABEL[detail.occurrence.severity]}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Origem</p><p className="mt-1 text-sm font-semibold">{detail.occurrence.sourceType === "visit" ? `Modo Visita #${detail.occurrence.sourceVisitId}` : detail.occurrence.reportedBy || "Registro direto"}</p></CardContent></Card></div>

              <Card><CardHeader className="pb-2"><CardTitle className="text-base">Fato registrado</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{detail.occurrence.description}</p>{detail.occurrence.location && <p className="mt-3 text-xs text-muted-foreground">Local: {detail.occurrence.location}</p>}</CardContent></Card>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button onClick={() => setEvidenceOpen(true)} className="h-auto justify-start gap-3 py-3"><Camera className="h-5 w-5" /><span className="text-left"><span className="block text-sm font-semibold">Adicionar evidência</span><span className="block text-[11px] opacity-80">Foto, vídeo, áudio, PDF ou relato</span></span></Button><Button variant="outline" onClick={() => setEventOpen("defense_received")} className="h-auto justify-start gap-3 py-3"><MessageSquareText className="h-5 w-5" /><span className="text-left"><span className="block text-sm font-semibold">Manifestação</span><span className="block text-[11px] text-muted-foreground">Registrar defesa ou resposta</span></span></Button><Button variant="outline" onClick={() => void loadRules()} className="h-auto justify-start gap-3 py-3"><BookOpenCheck className="h-5 w-5" /><span className="text-left"><span className="block text-sm font-semibold">Vincular regra</span><span className="block text-[11px] text-muted-foreground">Convenção e regimento</span></span></Button><Button variant="outline" onClick={() => setNoticeOpen(true)} className="h-auto justify-start gap-3 py-3"><Gavel className="h-5 w-5" /><span className="text-left"><span className="block text-sm font-semibold">Providência</span><span className="block text-[11px] text-muted-foreground">Notificação, advertência ou multa</span></span></Button></div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4 text-cyan-700" />Regra relacionada</CardTitle><Button size="sm" variant="ghost" onClick={() => void loadRules()}>Consultar</Button></div></CardHeader><CardContent>{detail.occurrence.ruleReference ? <div><p className="text-sm font-semibold">{detail.occurrence.ruleReference}</p><p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">{detail.occurrence.ruleExcerpt}</p></div> : <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhuma regra vinculada. Use “Consultar” para buscar nos documentos indexados.</div>}</CardContent></Card>

                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-cyan-700" />Verificador de consistência</CardTitle><Button size="sm" variant="ghost" onClick={() => void runConsistency()}>Verificar</Button></div></CardHeader><CardContent><p className="text-sm text-muted-foreground">Confere evidências, regra vinculada, reincidência, histórico processual e casos semelhantes antes de uma medida disciplinar.</p><div className="mt-3 flex items-center gap-2"><Select value={plannedAction} onValueChange={value => setPlannedAction(value as NoticeType)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NOTICE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button size="sm" onClick={() => void runConsistency()}>Analisar</Button></div></CardContent></Card>
              </div>

              <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4 text-cyan-700" />Evidências <Badge variant="secondary">{detail.evidence.length}</Badge></CardTitle><Button size="sm" variant="ghost" onClick={() => setEvidenceOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button></div></CardHeader><CardContent>{!detail.evidence.length ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma evidência registrada.</p> : <div className="grid gap-2">{detail.evidence.map(evidence => <div key={evidence.id} className="flex items-start gap-3 rounded-xl border p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><FileCheck2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{evidence.fileName || (evidence.kind === "testimony" ? "Relato / testemunho" : evidence.kind)}</p><p className="mt-0.5 text-xs text-muted-foreground">{evidence.description || "Sem descrição"}{evidence.witnessName ? ` · ${evidence.witnessName}` : ""}</p>{evidence.sha256 && <p className="mt-1 truncate font-mono text-[10px] text-slate-400">SHA-256 {evidence.sha256}</p>}</div>{evidence.fileUrl && <Button size="sm" variant="ghost" onClick={() => window.open(evidence.fileUrl!, "_blank")}>Abrir</Button>}<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (!selectedId || !window.confirm("Remover esta evidência do caso?")) return; await deleteOccurrenceEvidence(selectedId, evidence.id); await refreshDetail(); }}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}</CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Send className="h-4 w-4 text-cyan-700" />Comunicações e penalidades <Badge variant="secondary">{detail.notices.length}</Badge></CardTitle></CardHeader><CardContent>{!detail.notices.length ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma minuta vinculada ao caso.</p> : <div className="space-y-3">{detail.notices.map(notice => <div key={notice.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{NOTICE_LABEL[notice.type]}</Badge><span className="text-sm font-semibold">{notice.subject}</span><Badge variant="outline">{notice.status === "sent" ? "Enviada/aplicada" : "Rascunho"}</Badge></div>{notice.warning && <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{notice.warning}</div>}<p className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{notice.generatedContent}</p>{notice.legalBasis && <p className="mt-2 text-xs"><strong>Base:</strong> {notice.legalBasis}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(notice.generatedContent || ""); toast.success("Minuta copiada."); }}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button>{notice.status !== "sent" && <Button size="sm" onClick={() => void markSent(notice.id)} disabled={actionLoading}><Send className="mr-1 h-3.5 w-3.5" />Registrar como {notice.type === "multa" ? "aplicada" : "enviada"}</Button>}</div></div>)}</div>}</CardContent></Card>

              {detail.previousOccurrences.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-cyan-700" />Histórico semelhante da unidade</CardTitle></CardHeader><CardContent className="space-y-2">{detail.previousOccurrences.map(previous => <div key={previous.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"><span className="text-xs font-bold">#{previous.id}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{previous.title}</p><p className="text-xs text-muted-foreground">{formatDate(previous.happenedAt, false)}</p></div><Badge variant="outline">{STATUS_LABEL[previous.status] || previous.status}</Badge></div>)}</CardContent></Card>}

              <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-cyan-700" />Linha do tempo</CardTitle><Button size="sm" variant="ghost" onClick={() => setEventOpen("note")}><Plus className="mr-1 h-3.5 w-3.5" />Registro</Button></div></CardHeader><CardContent>{!detail.events.length ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : <div className="relative ml-2 border-l pl-5">{detail.events.map(event => <div key={event.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-cyan-600" /><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>{event.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>}</div>)}</div>}</CardContent></Card>

              {detail.occurrence.status !== "resolved" ? <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setResolveOpen(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Encerrar caso com desfecho</Button> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-800">Caso resolvido</p><p className="mt-1 text-sm text-emerald-700">{detail.occurrence.resolution || "Desfecho não detalhado."}</p><Button size="sm" variant="ghost" className="mt-2" onClick={async () => { await updateOccurrence(detail.occurrence.id, { status: "open" }); await Promise.all([refreshDetail(), refresh()]); }}>Reabrir caso</Button></div>}
            </div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar evidência</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={handleEvidence}><div className="space-y-2"><Label>Arquivo</Label><Input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,audio/*,application/pdf" /><p className="text-xs text-muted-foreground">Foto, vídeo, áudio ou PDF, até 25 MB. Arquivos recebem hash SHA-256 para controle de integridade.</p></div><div className="space-y-2"><Label htmlFor="ev-description">Descrição / relato</Label><Textarea id="ev-description" name="description" rows={4} placeholder="O que esta evidência demonstra? Se não houver arquivo, use este campo para registrar um testemunho." /></div><div className="space-y-2"><Label htmlFor="witnessName">Testemunha ou relator</Label><Input id="witnessName" name="witnessName" placeholder="Nome, função ou identificação" /></div><Button className="w-full" disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar ao caso"}</Button></form></DialogContent></Dialog>

      <Dialog open={!!eventOpen} onOpenChange={open => { if (!open) setEventOpen(null); }}><DialogContent><DialogHeader><DialogTitle>{eventOpen === "defense_received" ? "Registrar manifestação do morador" : "Adicionar registro à linha do tempo"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={handleEvent}>{eventOpen === "note" && <div className="space-y-2"><Label htmlFor="event-title">Título</Label><Input id="event-title" name="title" defaultValue="Registro interno" /></div>}<div className="space-y-2"><Label htmlFor="event-description">{eventOpen === "defense_received" ? "Manifestação / defesa" : "Descrição"}</Label><Textarea id="event-description" name="description" rows={6} required /></div><Button className="w-full" disabled={actionLoading}>Salvar na linha do tempo</Button></form></DialogContent></Dialog>

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Regras encontradas nos documentos do condomínio</DialogTitle></DialogHeader>{ruleLoading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : !ruleSuggestions.length ? <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma regra relevante foi localizada. Verifique se a Convenção/Regimento está indexada em Documentos.</div> : <div className="space-y-3">{ruleSuggestions.map((rule, index) => <Card key={`${rule.documentId}-${rule.pageNumber}-${index}`}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{rule.title}{rule.pageNumber ? ` · página ${rule.pageNumber}` : ""}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{rule.excerpt}</p></div><Button size="sm" onClick={() => void linkRule(rule)} disabled={actionLoading}>Vincular</Button></div></CardContent></Card>)}</div>}</DialogContent></Dialog>

      <Dialog open={consistencyOpen} onOpenChange={setConsistencyOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Verificador de consistência</DialogTitle></DialogHeader>{actionLoading && !consistency ? <div className="grid h-36 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : consistency && <div className="space-y-4"><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs text-slate-400">Preparação documental/processual</p><div className="mt-1 flex items-end gap-2"><span className="text-4xl font-bold">{consistency.readiness}%</span><span className="pb-1 text-sm text-slate-300">para revisão</span></div></div><div className="space-y-2">{consistency.checks.map(check => <div key={check.key} className="flex gap-3 rounded-xl border p-3">{check.status === "pass" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : check.status === "warn" ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /> : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}<div><p className="text-sm font-semibold">{check.label}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{check.detail}</p></div></div>)}</div><p className="text-xs text-muted-foreground">{consistency.disclaimer}</p></div>}</DialogContent></Dialog>

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}><DialogContent><DialogHeader><DialogTitle>Gerar providência com IA</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Tipo</Label><Select value={noticeType} onValueChange={value => setNoticeType(value as NoticeType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NOTICE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Minuta para revisão:</strong> o SindCopilot usa os fatos registrados e as regras indexadas. A decisão, a proporcionalidade e o envio continuam sob responsabilidade da gestão.</div><Button className="w-full" onClick={() => void makeNotice()} disabled={actionLoading}>{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><Gavel className="mr-2 h-4 w-4" />Gerar {NOTICE_LABEL[noticeType]}</>}</Button></div></DialogContent></Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}><DialogContent><DialogHeader><DialogTitle>Encerrar ocorrência</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={resolveCase}><div className="space-y-2"><Label htmlFor="resolution">Desfecho *</Label><Textarea id="resolution" name="resolution" rows={5} placeholder="Descreva como o caso foi resolvido, acordo, reparo, orientação, encerramento etc." required /></div><Button className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={actionLoading}><CheckCircle2 className="mr-2 h-4 w-4" />Encerrar e registrar desfecho</Button></form></DialogContent></Dialog>
    </div>
  );
}
