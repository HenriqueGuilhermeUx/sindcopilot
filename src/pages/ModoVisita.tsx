import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  blobToBase64,
  cacheCondominiums,
  clearDraftPhotos,
  clearVisitDraft,
  completeFieldVisit,
  compressVisitPhoto,
  createCustomItem,
  createVisitDraft,
  deleteVisitPhoto,
  futureDate,
  getFieldVisit,
  getVisitPhoto,
  listFieldVisits,
  loadCachedCondominiums,
  loadVisitDraft,
  saveVisitDraft,
  saveVisitPhoto,
  type CondoOption,
  type RecentVisit,
  type VisitDraft,
  type VisitDraftItem,
  type VisitItemStatus,
} from "@/lib/field-visits";
import { generateVisitReport } from "@/lib/visit-report";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STATUS_CONFIG: Record<VisitItemStatus, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: "Verificar", icon: Clock3, className: "border-slate-200 bg-white text-slate-600" },
  ok: { label: "Conforme", icon: Check, className: "border-emerald-500 bg-emerald-50 text-emerald-700" },
  attention: { label: "Atenção", icon: AlertTriangle, className: "border-amber-500 bg-amber-50 text-amber-700" },
  urgent: { label: "Urgente", icon: ShieldAlert, className: "border-rose-500 bg-rose-50 text-rose-700" },
};

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function ModoVisita() {
  const condominiumQuery = trpc.condominium.list.useQuery();
  const uploadDocument = trpc.document.upload.useMutation();
  const [draft, setDraft] = useState<VisitDraft | null>(() => loadVisitDraft());
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customArea, setCustomArea] = useState("Área comum");
  const [customTitle, setCustomTitle] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const previewRef = useRef<Record<string, string>>({});

  const remoteCondominiums = useMemo<CondoOption[]>(
    () =>
      (condominiumQuery.data || []).map((condominium: any) => ({
        id: Number(condominium.id),
        name: condominium.name,
        address: condominium.address || null,
        city: condominium.city || null,
      })),
    [condominiumQuery.data],
  );

  const condominiums = remoteCondominiums.length ? remoteCondominiums : loadCachedCondominiums();

  const stats = useMemo(() => {
    const items = draft?.items || [];
    return {
      total: items.length,
      checked: items.filter(item => item.status !== "pending").length,
      ok: items.filter(item => item.status === "ok").length,
      attention: items.filter(item => item.status === "attention").length,
      urgent: items.filter(item => item.status === "urgent").length,
      pending: items.filter(item => item.status === "pending").length,
    };
  }, [draft]);

  const progress = stats.total ? Math.round((stats.checked / stats.total) * 100) : 0;

  async function refreshVisits() {
    if (!navigator.onLine) {
      setLoadingVisits(false);
      return;
    }
    setLoadingVisits(true);
    try {
      const result = await listFieldVisits();
      setRecentVisits(result.visits);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVisits(false);
    }
  }

  useEffect(() => {
    if (remoteCondominiums.length) cacheCondominiums(remoteCondominiums);
  }, [remoteCondominiums]);

  useEffect(() => {
    void refreshVisits();
  }, []);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      toast.success("Internet disponível. Sua visita já pode ser sincronizada.");
      void refreshVisits();
    };
    const offline = () => {
      setIsOnline(false);
      toast.info("Modo offline ativado. O rascunho continuará salvo neste aparelho.");
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (draft) saveVisitDraft(draft);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    async function restorePreviews() {
      if (!draft) return;
      const entries: Record<string, string> = {};
      for (const item of draft.items) {
        if (!item.photoId) continue;
        const blob = await getVisitPhoto(item.photoId).catch(() => null);
        if (!blob || cancelled) continue;
        entries[item.clientId] = URL.createObjectURL(blob);
      }
      if (cancelled) {
        Object.values(entries).forEach(URL.revokeObjectURL);
        return;
      }
      Object.values(previewRef.current).forEach(URL.revokeObjectURL);
      previewRef.current = entries;
      setPhotoPreviews(entries);
    }
    void restorePreviews();
    return () => {
      cancelled = true;
    };
  }, [draft?.localId]);

  useEffect(
    () => () => {
      Object.values(previewRef.current).forEach(URL.revokeObjectURL);
    },
    [],
  );

  function updateItem(clientId: string, patch: Partial<VisitDraftItem>) {
    setDraft(current =>
      current
        ? {
            ...current,
            items: current.items.map(item => (item.clientId === clientId ? { ...item, ...patch } : item)),
          }
        : current,
    );
  }

  function setStatus(item: VisitDraftItem, status: VisitItemStatus) {
    const dueDate =
      status === "urgent"
        ? item.dueDate || futureDate(1)
        : status === "attention"
          ? item.dueDate || futureDate(7)
          : null;
    updateItem(item.clientId, { status, dueDate });
  }

  function startVisit(condominium: CondoOption) {
    const existing = loadVisitDraft();
    if (existing && existing.condominiumId !== condominium.id) {
      const replace = window.confirm(
        `Existe uma visita em andamento em ${existing.condominiumName}. Deseja descartá-la e iniciar outra?`,
      );
      if (!replace) return;
      void clearDraftPhotos(existing);
    }
    const next = createVisitDraft(condominium);
    saveVisitDraft(next);
    setDraft(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function abandonVisit() {
    if (!draft || !window.confirm("Descartar esta visita e todas as fotos ainda não sincronizadas?")) return;
    await clearDraftPhotos(draft);
    clearVisitDraft();
    Object.values(previewRef.current).forEach(URL.revokeObjectURL);
    previewRef.current = {};
    setPhotoPreviews({});
    setDraft(null);
  }

  function addCustomOccurrence() {
    if (!draft || customTitle.trim().length < 3) {
      toast.error("Descreva a ocorrência em pelo menos 3 caracteres.");
      return;
    }
    const item = createCustomItem(customArea.trim() || "Área comum", customTitle.trim());
    setDraft({ ...draft, items: [item, ...draft.items] });
    setCustomTitle("");
    setCustomArea("Área comum");
    setCustomOpen(false);
    toast.success("Ocorrência adicionada ao topo do checklist.");
  }

  async function capturePhoto(item: VisitDraftItem, file?: File) {
    if (!file) return;
    try {
      const compressed = await compressVisitPhoto(file);
      const photoId = item.photoId || item.clientId;
      await saveVisitPhoto(photoId, compressed);
      const url = URL.createObjectURL(compressed);
      if (previewRef.current[item.clientId]) URL.revokeObjectURL(previewRef.current[item.clientId]);
      previewRef.current = { ...previewRef.current, [item.clientId]: url };
      setPhotoPreviews(previewRef.current);
      updateItem(item.clientId, {
        photoId,
        photoName: `visita-${Date.now()}.jpg`,
        photoType: "image/jpeg",
      });
      toast.success("Foto salva no aparelho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a foto.");
    }
  }

  async function removePhoto(item: VisitDraftItem) {
    if (item.photoId) await deleteVisitPhoto(item.photoId).catch(() => undefined);
    if (previewRef.current[item.clientId]) URL.revokeObjectURL(previewRef.current[item.clientId]);
    const next = { ...previewRef.current };
    delete next[item.clientId];
    previewRef.current = next;
    setPhotoPreviews(next);
    updateItem(item.clientId, { photoId: null, photoName: null, photoType: null });
  }

  function dictate(item: VisitDraftItem) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info("O ditado não está disponível neste navegador. Use o teclado do celular.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => toast.info("Pode falar. Estou ouvindo…");
    recognition.onerror = () => toast.error("Não foi possível usar o microfone.");
    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      updateItem(item.clientId, { notes: [item.notes, transcript].filter(Boolean).join(" ") });
      toast.success("Observação adicionada.");
    };
    recognition.start();
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") toast.success("SindCopilot instalado na tela inicial.");
    setInstallPrompt(null);
  }

  async function finishVisit() {
    if (!draft) return;
    if (!isOnline) {
      toast.error("A visita está salva. Conecte-se à internet para finalizar e sincronizar.");
      return;
    }
    if (stats.pending > 0) {
      const proceed = window.confirm(
        `Ainda existem ${stats.pending} item(ns) sem verificação. Deseja finalizar mesmo assim?`,
      );
      if (!proceed) return;
    }

    setSyncing(true);
    try {
      const documentIds: Record<string, number | null> = {};
      const itemsWithPhotos = draft.items.filter(item => item.photoId);

      for (let index = 0; index < itemsWithPhotos.length; index += 1) {
        const item = itemsWithPhotos[index];
        toast.info(`Enviando foto ${index + 1} de ${itemsWithPhotos.length}…`);
        const blob = item.photoId ? await getVisitPhoto(item.photoId) : null;
        if (!blob) continue;
        const fileBase64 = await blobToBase64(blob);
        const uploaded = await uploadDocument.mutateAsync({
          condominiumId: draft.condominiumId,
          type: "outro",
          title: `Visita • ${item.area} • ${item.title}`,
          description: item.notes || `Registro fotográfico da visita em ${draft.condominiumName}.`,
          fileBase64,
          fileName: `visita-${slug(draft.condominiumName)}-${slug(item.area)}-${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });
        documentIds[item.clientId] = uploaded.id;
      }

      const result = await completeFieldVisit(draft, documentIds);
      generateVisitReport({
        id: result.id,
        condominiumName: draft.condominiumName,
        condominiumAddress: draft.condominiumAddress,
        startedAt: draft.startedAt,
        completedAt: result.completedAt,
        summary: draft.summary,
        items: draft.items.map(item => ({
          ...item,
          documentId: documentIds[item.clientId] || null,
        })),
      });

      await clearDraftPhotos(draft);
      clearVisitDraft();
      Object.values(previewRef.current).forEach(URL.revokeObjectURL);
      previewRef.current = {};
      setPhotoPreviews({});
      setDraft(null);
      await refreshVisits();
      toast.success(
        result.generatedObligationIds.length
          ? `Visita concluída e ${result.generatedObligationIds.length} pendência(s) criada(s).`
          : "Visita concluída e relatório gerado.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sincronizar a visita.");
    } finally {
      setSyncing(false);
    }
  }

  async function downloadPreviousReport(id: number) {
    try {
      const { visit } = await getFieldVisit(id);
      generateVisitReport({
        id: visit.id,
        condominiumName: visit.condominiumName,
        startedAt: visit.startedAt,
        completedAt: visit.completedAt,
        summary: visit.summary,
        items: visit.items,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório.");
    }
  }

  if (!draft) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 pb-24 dark:bg-background sm:rounded-3xl">
        <section className="overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 pb-8 pt-7 text-white sm:rounded-3xl sm:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3 border-white/10 bg-white/10 text-cyan-100 hover:bg-white/10">
                  <Smartphone className="mr-1 h-3.5 w-3.5" /> Modo Campo
                </Badge>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Visita resolvida no celular.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Checklist, foto, prazo e relatório em uma única jornada — mesmo em locais sem sinal.
                </p>
              </div>
              <div className={cn("flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", isOnline ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200")}>
                {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>

            {installPrompt && (
              <Button onClick={installApp} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <Download className="mr-2 h-4 w-4" /> Instalar como aplicativo
              </Button>
            )}
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Onde será a visita?</h2>
                <p className="text-sm text-muted-foreground">Toque no condomínio para começar imediatamente.</p>
              </div>
              {condominiumQuery.isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>

            <div className="space-y-3">
              {condominiums.map(condominium => (
                <button
                  key={condominium.id}
                  onClick={() => startVisit(condominium)}
                  className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:bg-card"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{condominium.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[condominium.address, condominium.city].filter(Boolean).join(" • ") || "Endereço não informado"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-600" />
                </button>
              ))}

              {!condominiumQuery.isLoading && !condominiums.length && (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center">
                    <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                    <p className="font-medium">Cadastre um condomínio antes de iniciar a visita.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Últimas visitas</h2>
                <p className="text-sm text-muted-foreground">Histórico e relatórios de campo.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void refreshVisits()} disabled={loadingVisits || !isOnline}>
                <RefreshCw className={cn("h-4 w-4", loadingVisits && "animate-spin")} />
              </Button>
            </div>

            <div className="space-y-3">
              {recentVisits.map(visit => (
                <Card key={visit.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{visit.condominiumName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(visit.completedAt, true)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void downloadPreviousReport(visit.id)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><strong className="block text-base">{visit.okCount}</strong>Conforme</div>
                      <div className="rounded-xl bg-amber-50 p-2 text-amber-700"><strong className="block text-base">{visit.attentionCount}</strong>Atenção</div>
                      <div className="rounded-xl bg-rose-50 p-2 text-rose-700"><strong className="block text-base">{visit.urgentCount}</strong>Urgente</div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!loadingVisits && !recentVisits.length && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center dark:bg-card">
                  <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">Sua primeira visita aparecerá aqui.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 pb-32 dark:bg-background sm:rounded-3xl">
      <section className="sticky top-16 z-20 border-b bg-slate-950 px-4 py-4 text-white shadow-lg sm:rounded-t-3xl sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-cyan-200">
                <ClipboardCheck className="h-3.5 w-3.5" /> VISITA EM ANDAMENTO
              </div>
              <h1 className="truncate text-lg font-bold sm:text-xl">{draft.condominiumName}</h1>
              <p className="truncate text-xs text-slate-400">Iniciada em {formatDate(draft.startedAt, true)}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => void abandonVisit()}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-cyan-100">{progress}%</span>
          </div>
        </div>
      </section>

      {!isOnline && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
          <WifiOff className="mr-2 inline h-4 w-4" /> Sem sinal. Tudo continua salvo neste aparelho.
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-6">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-card"><strong className="block text-xl">{stats.checked}</strong><span className="text-[11px] text-muted-foreground">Verificados</span></div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-center text-emerald-700"><strong className="block text-xl">{stats.ok}</strong><span className="text-[11px]">Conformes</span></div>
          <div className="rounded-2xl bg-amber-50 p-3 text-center text-amber-700"><strong className="block text-xl">{stats.attention}</strong><span className="text-[11px]">Atenção</span></div>
          <div className="rounded-2xl bg-rose-50 p-3 text-center text-rose-700"><strong className="block text-xl">{stats.urgent}</strong><span className="text-[11px]">Urgentes</span></div>
        </div>

        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-card">
          <CardContent className="p-4">
            {!customOpen ? (
              <button onClick={() => setCustomOpen(true)} className="flex w-full items-center gap-3 text-left">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-600 text-white"><Plus className="h-5 w-5" /></div>
                <div className="flex-1"><p className="font-bold">Registrar ocorrência rápida</p><p className="text-sm text-muted-foreground">Achou algo fora do checklist? Registre em segundos.</p></div>
                <ChevronRight className="h-5 w-5 text-cyan-700" />
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><p className="font-bold">Nova ocorrência</p><Button variant="ghost" size="icon" onClick={() => setCustomOpen(false)}><X className="h-4 w-4" /></Button></div>
                <Input value={customArea} onChange={event => setCustomArea(event.target.value)} placeholder="Área: garagem, piscina, portaria…" />
                <Input value={customTitle} onChange={event => setCustomTitle(event.target.value)} placeholder="O que foi encontrado?" autoFocus />
                <Button className="w-full" onClick={addCustomOccurrence}><Plus className="mr-2 h-4 w-4" /> Adicionar ocorrência</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {draft.items.map((item, index) => {
            const config = STATUS_CONFIG[item.status];
            const StatusIcon = config.icon;
            return (
              <Card key={item.clientId} className={cn("overflow-hidden transition", item.status === "urgent" && "border-rose-300 shadow-rose-100", item.status === "attention" && "border-amber-300")}> 
                <CardHeader className="space-y-2 p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold", item.status === "ok" ? "bg-emerald-100 text-emerald-700" : item.status === "urgent" ? "bg-rose-100 text-rose-700" : item.status === "attention" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{index + 1}</div>
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.area}</p><CardTitle className="mt-1 text-base leading-5">{item.title}</CardTitle></div>
                    {item.isCustom && <Badge variant="outline">Ocorrência</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="grid grid-cols-3 gap-2">
                    {(["ok", "attention", "urgent"] as VisitItemStatus[]).map(status => {
                      const option = STATUS_CONFIG[status];
                      const Icon = option.icon;
                      return (
                        <button key={status} onClick={() => setStatus(item, status)} className={cn("flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition active:scale-95", item.status === status ? option.className : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:bg-card")}>
                          <Icon className="mb-1 h-4 w-4" /> {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {item.status !== "pending" && (
                    <>
                      <div className="relative">
                        <Textarea value={item.notes} onChange={event => updateItem(item.clientId, { notes: event.target.value })} placeholder={item.status === "ok" ? "Observação opcional…" : "Descreva o problema e o que precisa ser feito…"} className="min-h-20 pr-12" />
                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1.5 right-1.5" onClick={() => dictate(item)} title="Ditar observação"><Mic className="h-4 w-4" /></Button>
                      </div>

                      {(item.status === "attention" || item.status === "urgent") && (
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-muted/50">
                          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Prazo para resolver</label>
                          <Input type="date" value={item.dueDate || ""} onChange={event => updateItem(item.clientId, { dueDate: event.target.value || null })} />
                          <p className="mt-1.5 text-[11px] text-muted-foreground">Ao finalizar, isso vira uma pendência no Compliance automaticamente.</p>
                        </div>
                      )}

                      {photoPreviews[item.clientId] ? (
                        <div className="relative overflow-hidden rounded-2xl border bg-slate-100">
                          <img src={photoPreviews[item.clientId]} alt={`Foto de ${item.title}`} className="h-44 w-full object-cover" />
                          <Button variant="destructive" size="icon" className="absolute right-2 top-2 h-8 w-8 rounded-full" onClick={() => void removePhoto(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          <Badge className="absolute bottom-2 left-2 bg-black/65 text-white hover:bg-black/65"><Save className="mr-1 h-3 w-3" /> Salva no aparelho</Badge>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 dark:bg-card">
                          <Camera className="h-4 w-4" /> Tirar foto
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const file = event.target.files?.[0]; void capturePhoto(item, file); event.currentTarget.value = ""; }} />
                        </label>
                      )}
                    </>
                  )}

                  {item.status === "pending" && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground dark:bg-muted/50"><StatusIcon className="h-4 w-4" /> Marque a situação encontrada para continuar.</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Resumo geral</CardTitle></CardHeader>
          <CardContent><Textarea value={draft.summary} onChange={event => setDraft({ ...draft, summary: event.target.value })} placeholder="Ex.: visita acompanhada pelo zelador; fornecedor acionado para os itens urgentes…" className="min-h-24" /></CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,.12)] backdrop-blur lg:left-72 dark:bg-background/95">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block"><p className="font-semibold">{stats.checked} de {stats.total} verificados</p><p className="text-xs text-muted-foreground">O rascunho é salvo automaticamente.</p></div>
          <Button size="lg" className="h-12 flex-1 bg-slate-950 text-white hover:bg-slate-800 sm:flex-none sm:px-8" onClick={() => void finishVisit()} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isOnline ? <FileCheck2 className="mr-2 h-5 w-5" /> : <WifiOff className="mr-2 h-5 w-5" />}
            {syncing ? "Sincronizando…" : isOnline ? "Finalizar visita" : "Aguardando internet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
