import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  classifyStatement,
  closePeriod,
  createClosing,
  fileToBase64,
  getStatementFile,
  importStatement,
  loadFinance,
  updateStatementBalances,
  updateTransaction,
  type FinanceDashboard,
  type FinanceStatement,
  type FinanceTransaction,
} from "@/lib/finance";
import { generateFinanceReport } from "@/lib/finance-report";

const EXPENSE_CATEGORIES = [
  "Pessoal", "Encargos e tributos", "Água", "Energia", "Gás", "Manutenção", "Segurança", "Limpeza", "Seguros",
  "Honorários e administração", "Obras", "Tarifas bancárias", "Outras despesas",
];
const INCOME_CATEGORIES = ["Cotas condominiais", "Acordos", "Multas e juros", "Rendimentos", "Outras receitas"];

function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function parseNullableNumber(value: FormDataEntryValue | null) {
  const text = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function statusBadge(status: string) {
  if (status === "closed") return <Badge className="bg-slate-900 text-white">Fechado</Badge>;
  if (status === "reconciled") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Conciliado</Badge>;
  if (status === "review") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Em revisão</Badge>;
  return <Badge variant="secondary">Importado</Badge>;
}

function confidenceLabel(tx: FinanceTransaction) {
  if (tx.classification_source === "manual") return "Revisado";
  if (tx.classification_source === "rule") return "Aprendido";
  if (tx.classification_source === "ai") return `IA ${Math.round(Number(tx.confidence || 0) * 100)}%`;
  return `Auto ${Math.round(Number(tx.confidence || 0) * 100)}%`;
}

export default function Financeiro() {
  const { data: condos } = trpc.condominium.list.useQuery();
  const [condominiumId, setCondominiumId] = useState(0);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<FinanceStatement | null>(null);
  const [closingNotes, setClosingNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!condominiumId && condos?.length) setCondominiumId(Number((condos as any[])[0].id));
  }, [condos, condominiumId]);

  async function refresh() {
    if (!condominiumId) return;
    setLoading(true);
    try { setDashboard(await loadFinance(condominiumId, month)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar o financeiro."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [condominiumId, month]);

  const condominium = useMemo(() => (condos as any[] | undefined)?.find(c => Number(c.id) === condominiumId), [condos, condominiumId]);
  const transactions = useMemo(() => {
    const rows = dashboard?.transactions || [];
    return onlyReview ? rows.filter(row => row.needs_review) : rows;
  }, [dashboard, onlyReview]);

  const openingBalance = useMemo(() => {
    if (dashboard?.closing) return Number(dashboard.closing.opening_balance || 0);
    return Number(dashboard?.statements.find(statement => statement.opening_balance != null)?.opening_balance || 0);
  }, [dashboard]);
  const calculatedClosing = openingBalance + Number(dashboard?.summary.net || 0);
  const bankClosing = dashboard?.closing?.bank_closing_balance ?? dashboard?.statements.slice().reverse().find(statement => statement.bank_closing_balance != null)?.bank_closing_balance ?? null;
  const difference = bankClosing == null ? null : Number(bankClosing) - calculatedClosing;
  const reconciled = difference != null && Math.abs(difference) < .01 && (dashboard?.summary.reviewCount || 0) === 0;

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Selecione o extrato bancário.");
    if (!condominiumId) return toast.error("Selecione o condomínio antes de importar.");
    if (file.size > 20 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 20 MB.");
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await importStatement({
        condominiumId,
        fileBase64: await fileToBase64(file),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bankName: String(form.get("bankName") || "") || null,
        accountName: String(form.get("accountName") || "") || null,
      });
      toast.success(`${result.imported} lançamentos importados. ${result.reviewCount ? `${result.reviewCount} aguardam revisão.` : "Tudo classificado."}`);
      if (result.periodStart) setMonth(result.periodStart.slice(0, 7));
      setImportOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar o extrato."); }
    finally { setBusy(false); }
  }

  async function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTx) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await updateTransaction(selectedTx.id, {
        category: String(form.get("category") || ""),
        subcategory: String(form.get("subcategory") || "") || null,
        notes: String(form.get("notes") || "") || null,
        learn: form.get("learn") === "on",
      });
      toast.success("Lançamento revisado. A classificação foi salva.");
      setTransactionOpen(false);
      setSelectedTx(null);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar a classificação."); }
    finally { setBusy(false); }
  }

  async function saveBalances(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStatement) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await updateStatementBalances(selectedStatement.id, parseNullableNumber(form.get("openingBalance")), parseNullableNumber(form.get("bankClosingBalance")));
      toast.success(result.reconciliation.difference == null ? "Saldos registrados." : Math.abs(result.reconciliation.difference) < .01 ? "Extrato conciliado até o centavo." : `Ainda existe diferença de ${money(result.reconciliation.difference)}.`);
      setBalanceOpen(false);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os saldos."); }
    finally { setBusy(false); }
  }

  async function runAi(statementId: number) {
    const accepted = window.confirm("A IA processará descrição, direção e valor dos lançamentos que ainda precisam de revisão. O arquivo bancário completo não é enviado nesta etapa. Continuar?");
    if (!accepted) return;
    setBusy(true);
    try {
      const result = await classifyStatement(statementId);
      toast.success(result.updated ? `${result.updated} lançamentos analisados pela IA.` : "Não há lançamentos pendentes nesse extrato.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível classificar com IA."); }
    finally { setBusy(false); }
  }

  async function openOriginal(statementId: number) {
    try {
      const result = await getStatementFile(statementId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir o extrato original."); }
  }

  async function updateClosing() {
    if (!condominiumId) return;
    setBusy(true);
    try {
      const result = await createClosing(condominiumId, month, closingNotes || null);
      toast.success(result.closing.status === "reconciled" ? "Mês conciliado e pronto para fechamento." : "Fechamento atualizado. Revise as pendências antes de concluir.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o fechamento."); }
    finally { setBusy(false); }
  }

  async function finalizeClosing() {
    if (!dashboard?.closing) return;
    setBusy(true);
    try {
      await closePeriod(dashboard.closing.id);
      toast.success("Mês fechado. O balancete permanece disponível para exportação.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível fechar o mês."); }
    finally { setBusy(false); }
  }

  function exportPdf() {
    if (!dashboard || !condominium) return;
    if (!dashboard.transactions.length) return toast.error("Ainda não há lançamentos nesse mês.");
    generateFinanceReport({ condominium, dashboard });
    toast.success("Balancete PDF gerado.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Landmark className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Financeiro Inteligente</h1>
              <p className="text-sm text-muted-foreground">Extrato → classificação → conciliação → balancete, sem Excel.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Button>
          <Button variant="outline" onClick={exportPdf} disabled={!dashboard?.transactions.length}><Download className="mr-2 h-4 w-4" />Exportar PDF</Button>
          <Button onClick={() => setImportOpen(true)} disabled={!condominiumId}><Upload className="mr-2 h-4 w-4" />Importar extrato</Button>
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/10">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"><Building2 className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="font-semibold">Cada condomínio tem seu próprio financeiro</p>
            <p className="text-sm text-muted-foreground">Troque o condomínio e o SindCopilot mantém extratos, regras aprendidas, fechamentos e PDFs totalmente separados.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={condominiumId ? String(condominiumId) : ""} onValueChange={value => setCondominiumId(Number(value))}>
              <SelectTrigger className="min-w-56 bg-background"><SelectValue placeholder="Selecione o condomínio" /></SelectTrigger>
              <SelectContent>{(condos as any[] || []).map(condo => <SelectItem key={condo.id} value={String(condo.id)}>{condo.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="month" value={month} onChange={event => setMonth(event.target.value)} className="bg-background" />
          </div>
        </CardContent>
      </Card>

      {!condominiumId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Cadastre ou selecione um condomínio para começar.</CardContent></Card>
      ) : loading && !dashboard ? (
        <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Saldo inicial</p><p className="mt-1 text-xl font-bold">{money(openingBalance)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Receitas</p><p className="mt-1 text-xl font-bold text-emerald-600">{money(dashboard?.summary.income)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Despesas</p><p className="mt-1 text-xl font-bold text-rose-600">{money(dashboard?.summary.expenses)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Saldo calculado</p><p className="mt-1 text-xl font-bold">{money(calculatedClosing)}</p></CardContent></Card>
            <Card className={reconciled ? "border-emerald-300" : dashboard?.transactions.length ? "border-amber-300" : ""}><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Conciliação</p><div className="mt-1 flex items-center gap-2">{reconciled ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Scale className="h-5 w-5 text-amber-600" />}<p className="text-xl font-bold">{difference == null ? "Pendente" : money(difference)}</p></div></CardContent></Card>
          </div>

          {(dashboard?.summary.reviewCount || 0) > 0 && (
            <Card className="border-amber-300 bg-amber-50/70 dark:bg-amber-950/10"><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div className="flex-1"><p className="font-semibold">{dashboard?.summary.reviewCount} lançamentos precisam de confirmação</p><p className="text-sm text-muted-foreground">Revise apenas as exceções; o restante já está organizado pelo motor financeiro.</p></div><Button variant="outline" size="sm" onClick={() => setOnlyReview(true)}>Ver pendentes</Button></CardContent></Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div><CardTitle className="text-base">Extratos importados</CardTitle><p className="mt-1 text-xs text-muted-foreground">O arquivo original fica guardado para auditoria.</p></div>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Plus className="mr-1 h-4 w-4" />Extrato</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {!dashboard?.statements.length ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum extrato importado neste período.</div> : dashboard.statements.map(statement => (
                  <div key={statement.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><FileSpreadsheet className="h-5 w-5 text-slate-600" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{statement.file_name}</p><p className="text-xs text-muted-foreground">{shortDate(statement.period_start)} → {shortDate(statement.period_end)} • {statement.transaction_count} lançamentos • {statement.source_format.toUpperCase()}</p></div>
                      {statusBadge(statement.status)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void openOriginal(statement.id)}><FileText className="mr-1 h-4 w-4" />Original</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedStatement(statement); setBalanceOpen(true); }}><Scale className="mr-1 h-4 w-4" />Saldos</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void runAi(statement.id)}><BrainCircuit className="mr-1 h-4 w-4" />Classificar pendentes com IA</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Fechamento mensal</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-muted/30">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Saldo bancário</span><strong>{bankClosing == null ? "Não informado" : money(bankClosing)}</strong></div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">Saldo calculado</span><strong>{money(calculatedClosing)}</strong></div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2"><span className="text-sm font-medium">Diferença</span><strong className={difference != null && Math.abs(difference) < .01 ? "text-emerald-600" : "text-amber-600"}>{difference == null ? "Pendente" : money(difference)}</strong></div>
                </div>
                <Textarea placeholder="Observações do fechamento (opcional)" value={closingNotes} onChange={event => setClosingNotes(event.target.value)} />
                <Button className="w-full" variant="outline" onClick={() => void updateClosing()} disabled={busy || !dashboard?.transactions.length}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Atualizar fechamento</Button>
                {dashboard?.closing?.status === "reconciled" && <Button className="w-full" onClick={() => void finalizeClosing()} disabled={busy}><LockKeyhole className="mr-2 h-4 w-4" />Fechar mês</Button>}
                {dashboard?.closing?.status === "closed" && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Mês fechado e conciliado.</div>}
                <Button className="w-full" variant="secondary" onClick={exportPdf} disabled={!dashboard?.transactions.length}><Download className="mr-2 h-4 w-4" />Gerar balancete PDF</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div><CardTitle className="text-base">Lançamentos do mês</CardTitle><p className="mt-1 text-xs text-muted-foreground">Clique em qualquer lançamento para revisar a categoria e ensinar o SindCopilot.</p></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyReview} onChange={event => setOnlyReview(event.target.checked)} />Somente pendentes</label>
            </CardHeader>
            <CardContent>
              {!transactions.length ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{onlyReview ? "Nenhum lançamento pendente." : "Nenhum lançamento neste mês."}</div> : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <button key={tx.id} onClick={() => { setSelectedTx(tx); setTransactionOpen(true); }} className="grid w-full gap-2 rounded-xl border p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/30 sm:grid-cols-[84px_1fr_170px_130px] sm:items-center">
                      <span className="text-xs text-muted-foreground">{shortDate(tx.posted_at)}</span>
                      <span className="min-w-0"><span className="block truncate font-medium">{tx.description}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{tx.category}{tx.subcategory ? ` › ${tx.subcategory}` : ""} • {confidenceLabel(tx)}</span></span>
                      <span className={`text-sm font-bold sm:text-right ${tx.direction === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.direction === "income" ? "+" : "-"} {money(Math.abs(Number(tx.amount)))}</span>
                      <span className="flex items-center gap-2 sm:justify-end">{tx.needs_review ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Revisar</Badge> : <Badge variant="outline" className="text-emerald-700">OK</Badge>}<Pencil className="h-4 w-4 text-muted-foreground" /></span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!!dashboard?.summary.categories.length && (
            <Card><CardHeader><CardTitle className="text-base">Resumo por categoria</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dashboard.summary.categories.map(item => <div key={item.category} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm font-medium">{item.category}</span><strong>{money(item.total)}</strong></div>)}</CardContent></Card>
          )}
        </>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleImport}>
            <div className="rounded-xl border border-dashed bg-muted/20 p-4"><Label htmlFor="statement-file">Extrato do {condominium?.name || "condomínio"}</Label><Input ref={fileRef} id="statement-file" className="mt-2" type="file" accept=".csv,.xlsx,.xls,.ofx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /><p className="mt-2 text-xs text-muted-foreground">CSV, XLSX, OFX ou PDF • máximo 20 MB. CSV/XLSX/OFX oferecem a leitura mais determinística.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="bankName">Banco (opcional)</Label><Input id="bankName" name="bankName" placeholder="Itaú, Bradesco..." /></div><div><Label htmlFor="accountName">Conta (opcional)</Label><Input id="accountName" name="accountName" placeholder="Conta corrente principal" /></div></div>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800"><strong>Auditável:</strong> o arquivo original é guardado de forma privada e cada lançamento mantém referência à linha/transação de origem.</div>
            <Button className="w-full" type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Ler e importar extrato</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={transactionOpen} onOpenChange={open => { setTransactionOpen(open); if (!open) setSelectedTx(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Revisar lançamento</DialogTitle></DialogHeader>{selectedTx && (
          <form className="space-y-4" onSubmit={saveTransaction}>
            <div className="rounded-xl bg-muted/40 p-3"><p className="font-medium">{selectedTx.description}</p><div className="mt-1 flex justify-between text-sm text-muted-foreground"><span>{shortDate(selectedTx.posted_at)}</span><strong className={selectedTx.direction === "income" ? "text-emerald-600" : "text-rose-600"}>{money(Math.abs(Number(selectedTx.amount)))}</strong></div></div>
            <div><Label>Categoria</Label><Select name="category" defaultValue={selectedTx.category}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(selectedTx.direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="subcategory">Subcategoria (opcional)</Label><Input id="subcategory" name="subcategory" defaultValue={selectedTx.subcategory || ""} placeholder="Ex.: Elevadores, Portaria, Folha..." /></div>
            <div><Label htmlFor="notes">Observação</Label><Textarea id="notes" name="notes" defaultValue={selectedTx.notes || ""} /></div>
            <label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input className="mt-1" type="checkbox" name="learn" defaultChecked /><span><strong>Aprender esta classificação</strong><span className="mt-0.5 block text-xs text-muted-foreground">Nos próximos extratos deste condomínio, descrições semelhantes podem ser categorizadas automaticamente.</span></span></label>
            <Button className="w-full" type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Confirmar classificação</Button>
          </form>
        )}</DialogContent>
      </Dialog>

      <Dialog open={balanceOpen} onOpenChange={open => { setBalanceOpen(open); if (!open) setSelectedStatement(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Conferir saldos do extrato</DialogTitle></DialogHeader>{selectedStatement && (
          <form className="space-y-4" onSubmit={saveBalances}>
            <p className="text-sm text-muted-foreground">Se o banco não trouxe os saldos de forma legível, informe-os aqui. O SindCopilot recalcula a conciliação imediatamente.</p>
            <div><Label htmlFor="openingBalance">Saldo inicial</Label><Input id="openingBalance" name="openingBalance" inputMode="decimal" defaultValue={selectedStatement.opening_balance == null ? "" : Number(selectedStatement.opening_balance).toFixed(2).replace(".", ",")} placeholder="0,00" /></div>
            <div><Label htmlFor="bankClosingBalance">Saldo final no banco</Label><Input id="bankClosingBalance" name="bankClosingBalance" inputMode="decimal" defaultValue={selectedStatement.bank_closing_balance == null ? "" : Number(selectedStatement.bank_closing_balance).toFixed(2).replace(".", ",")} placeholder="0,00" /></div>
            <Button className="w-full" type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scale className="mr-2 h-4 w-4" />}Conferir conciliação</Button>
          </form>
        )}</DialogContent>
      </Dialog>
    </div>
  );
}
