import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bell, Sparkles, FileText, Loader2, Copy, Eye, Trash2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { markOccurrenceNoticeSent } from "@/lib/occurrences";

const NOTICE_TYPES: Record<string, string> = { notificacao: "Notificação", multa: "Multa", comunicado: "Comunicado", advertencia: "Advertência" };

export default function Notificacoes() {
  const [open, setOpen] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState("");
  const [noticeType, setNoticeType] = useState("notificacao");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [generatedContent, setGeneratedContent] = useState<{ content: string; legalBasis: string; title: string; warning?: string | null } | null>(null);
  const [viewNotice, setViewNotice] = useState<any>(null);
  const [displayCondo, setDisplayCondo] = useState("");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data: condos } = trpc.condominium.list.useQuery();
  const { data: units } = trpc.unit.list.useQuery({ condominiumId: parseInt(selectedCondo || "0") }, { enabled: !!selectedCondo });
  const { data: notices, isLoading } = trpc.notice.list.useQuery({ condominiumId: parseInt(displayCondo || "0") }, { enabled: !!displayCondo });
  const generateMutation = trpc.notice.generate.useMutation({
    onSuccess: result => {
      setGeneratedContent({ content: result.content, legalBasis: result.legalBasis, title: result.title, warning: result.warning });
      void utils.notice.list.invalidate();
      toast.success("Minuta gerada para revisão.");
    },
    onError: error => toast.error(error.message || "Erro ao gerar documento"),
  });
  const updateMutation = trpc.notice.update.useMutation({ onSuccess: () => void utils.notice.list.invalidate() });
  const deleteMutation = trpc.notice.delete.useMutation({ onSuccess: () => { void utils.notice.list.invalidate(); toast.success("Removido."); } });

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    generateMutation.mutate({
      condominiumId: parseInt(selectedCondo),
      unitId: selectedUnit && selectedUnit !== "all" ? parseInt(selectedUnit) : undefined,
      type: noticeType as any,
      subject: form.get("subject") as string,
      description: form.get("description") as string,
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado.");
  }

  async function markSent(notice: any) {
    if (!window.confirm(notice.type === "multa" ? "Registrar esta multa como aplicada?" : "Registrar esta comunicação como enviada?")) return;
    setSendingId(Number(notice.id));
    try {
      if (notice.occurrenceId) await markOccurrenceNoticeSent(Number(notice.occurrenceId), Number(notice.id));
      else await updateMutation.mutateAsync({ id: Number(notice.id), status: "sent" });
      toast.success(notice.type === "multa" ? "Multa registrada como aplicada." : "Comunicação registrada como enviada.");
      await utils.notice.list.invalidate();
      if (viewNotice?.id === notice.id) setViewNotice({ ...viewNotice, status: "sent", sentAt: new Date().toISOString() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status.");
    } finally {
      setSendingId(null);
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Notificações e Multas</h1><p className="text-sm text-muted-foreground">Minutas para revisão, vinculadas às regras internas e, quando aplicável, à ocorrência de origem.</p></div><Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setGeneratedContent(null); }}><DialogTrigger asChild><Button><Sparkles className="mr-2 h-4 w-4" />Gerar com IA</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Gerar minuta com IA</DialogTitle></DialogHeader>{!generatedContent ? <form onSubmit={handleGenerate} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Condomínio *</Label><Select value={selectedCondo} onValueChange={value => { setSelectedCondo(value); setSelectedUnit(""); }}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{condos?.map((condo: any) => <SelectItem key={condo.id} value={condo.id.toString()}>{condo.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Tipo *</Label><Select value={noticeType} onValueChange={setNoticeType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NOTICE_TYPES).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div></div>{!!units?.length && <div className="space-y-2"><Label>Unidade</Label><Select value={selectedUnit} onValueChange={setSelectedUnit}><SelectTrigger><SelectValue placeholder="Todos os moradores" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os moradores</SelectItem>{units.map((unit: any) => <SelectItem key={unit.id} value={unit.id.toString()}>Unidade {unit.number}{unit.block ? ` - Bloco ${unit.block}` : ""}</SelectItem>)}</SelectContent></Select></div>}<div className="space-y-2"><Label htmlFor="subject">Assunto *</Label><Input id="subject" name="subject" placeholder="Ex: Barulho excessivo após 22h" required /></div><div className="space-y-2"><Label htmlFor="description">Descreva a situação *</Label><Textarea id="description" name="description" rows={4} required /></div><p className="text-xs text-muted-foreground">A saída é uma minuta para revisão humana. A IA só cita bases recuperadas dos documentos indexados.</p><Button type="submit" className="w-full" disabled={generateMutation.isPending || !selectedCondo}>{generateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><Sparkles className="mr-2 h-4 w-4" />Gerar minuta</>}</Button></form> : <div className="space-y-4"><div className="rounded-lg bg-muted/50 p-4"><h3 className="mb-2 font-semibold">{generatedContent.title}</h3>{generatedContent.warning && <div className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{generatedContent.warning}</div>}<div className="prose prose-sm max-w-none"><ReactMarkdown>{generatedContent.content}</ReactMarkdown></div>{generatedContent.legalBasis && generatedContent.legalBasis !== "Não aplicável" && <div className="mt-3 border-t pt-3"><p className="text-xs font-medium text-muted-foreground">Base indicada:</p><p className="mt-1 text-sm">{generatedContent.legalBasis}</p></div>}</div><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => void copy(generatedContent.content)}><Copy className="mr-2 h-4 w-4" />Copiar</Button><Button className="flex-1" onClick={() => { setGeneratedContent(null); setOpen(false); }}>Concluir revisão</Button></div></div>}</DialogContent></Dialog></div>

    <Select value={displayCondo} onValueChange={setDisplayCondo}><SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Selecione um condomínio" /></SelectTrigger><SelectContent>{condos?.map((condo: any) => <SelectItem key={condo.id} value={condo.id.toString()}>{condo.name}</SelectItem>)}</SelectContent></Select>

    <Dialog open={!!viewNotice} onOpenChange={open => { if (!open) setViewNotice(null); }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{viewNotice?.subject}</DialogTitle></DialogHeader>{viewNotice?.occurrenceId && <div className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900"><ShieldCheck className="mr-2 inline h-4 w-4" />Vinculada à ocorrência #{viewNotice.occurrenceId}. A linha do tempo e as evidências estão na Central de Ocorrências.</div>}{viewNotice?.warning && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{viewNotice.warning}</div>}{viewNotice?.generatedContent && <div className="space-y-4"><div className="prose prose-sm max-w-none"><ReactMarkdown>{viewNotice.generatedContent}</ReactMarkdown></div>{viewNotice.legalBasis && <div className="border-t pt-3"><p className="text-xs font-medium text-muted-foreground">Base indicada:</p><p className="mt-1 text-sm">{viewNotice.legalBasis}</p></div>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void copy(viewNotice.generatedContent)}><Copy className="mr-2 h-4 w-4" />Copiar</Button>{viewNotice.status !== "sent" && <Button onClick={() => void markSent(viewNotice)} disabled={sendingId === viewNotice.id}><Send className="mr-2 h-4 w-4" />Registrar como {viewNotice.type === "multa" ? "aplicada" : "enviada"}</Button>}</div></div>}</DialogContent></Dialog>

    {!displayCondo ? <div className="py-16 text-center text-muted-foreground"><Bell className="mx-auto mb-3 h-12 w-12 opacity-30" /><p className="font-medium">Selecione um condomínio</p></div> : isLoading ? <div>Carregando...</div> : !notices?.length ? <div className="py-16 text-center text-muted-foreground"><FileText className="mx-auto mb-3 h-12 w-12 opacity-30" /><p className="font-medium">Nenhuma minuta gerada</p></div> : <div className="grid gap-3">{notices.map((notice: any) => <Card key={notice.id} className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-4"><Bell className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{notice.subject}</p><Badge variant="outline" className="text-xs">{NOTICE_TYPES[notice.type]}</Badge><Badge variant={notice.status === "sent" ? "default" : "secondary"}>{notice.status === "sent" ? "Enviado/aplicado" : "Rascunho"}</Badge>{notice.occurrenceId && <Badge variant="outline" className="border-cyan-200 text-cyan-700">Caso #{notice.occurrenceId}</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{new Date(notice.createdAt).toLocaleDateString("pt-BR")}{notice.sentAt ? ` · registrado como enviado em ${new Date(notice.sentAt).toLocaleDateString("pt-BR")}` : ""}</p></div>{notice.generatedContent && <Button variant="ghost" size="icon" onClick={() => setViewNotice(notice)}><Eye className="h-3.5 w-3.5" /></Button>}{notice.status !== "sent" && <Button variant="ghost" size="icon" title={notice.type === "multa" ? "Registrar como aplicada" : "Registrar como enviada"} onClick={() => void markSent(notice)} disabled={sendingId === notice.id}><Send className="h-3.5 w-3.5 text-emerald-600" /></Button>}<Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate({ id: notice.id })}><Trash2 className="h-3.5 w-3.5" /></Button></div></CardContent></Card>)}</div>}
  </div>;
}
