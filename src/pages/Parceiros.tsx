import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";\nimport { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  Gift,
  Loader2,
  Megaphone,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

type Dashboard = {
  profile: null | {
    id: number;
    displayName: string;
    socialHandle: string | null;
    socialUrl: string | null;
    audienceSize: number | null;
    status: "pending" | "active" | "paused" | "rejected";
    commissionPercent: number;
    commissionMonths: number;
    payoutPixKeyMasked: string | null;
    payoutConfigured: boolean;
  };
  codes?: Array<{ id: number; code: string; campaignKey: string | null; shareUrl: string }>;
  campaign?: null | {
    key: string;
    name: string;
    promoPriceCents: number;
    regularPriceCents: number;
    maxRedemptions: number;
    reservedCount: number;
    redeemedCount: number;
    remaining: number;
    active: boolean;
  };
  metrics?: {
    clicks: number;
    leads: number;
    paidCustomers: number;
    grossRevenueCents: number;
    pendingCommissionCents: number;
    approvedCommissionCents: number;
    paidCommissionCents: number;
  };
  referrals?: Array<{ id: number; status: string; promoReserved: boolean; createdAt: string; firstPaidAt: string | null; lastPaidAt: string | null }>;
  commissions?: Array<{ id: number; paymentValueCents: number; commissionPercent: number; commissionValueCents: number; status: string; eligibleAt: string; paidAt: string | null; createdAt: string }>;
};

type AdminPartner = {
  id: number;
  name: string;
  email: string | null;
  displayName: string;
  socialHandle: string | null;
  socialUrl: string | null;
  audienceSize: number | null;
  status: string;
  createdAt: string;
};

function money(cents = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

async function authFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Entre na sua conta para continuar.");
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
}

function PublicProgram() {
  const { user } = useAuth();
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <Badge className="mb-5 border-emerald-300/30 bg-emerald-400/10 text-emerald-200">
          <Megaphone className="mr-2 h-4 w-4" /> Programa de Parceiros SindCopilot
        </Badge>
        <div className="grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              Indique uma ferramenta que resolve a rotina do síndico e <span className="text-emerald-300">ganhe com cada cliente ativo.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Influenciadores, consultores, administradoras, professores e criadores do mercado condominial podem receber 30% de comissão recorrente por até 12 meses sobre cada cliente indicado.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" asChild>
                <Link href={user ? "/parceiros" : "/cadastro?partner=1"}>{user ? "Abrir meu painel" : "Quero ser parceiro"} <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              {!user && <Button size="lg" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild><Link href="/login">Já tenho acesso</Link></Button>}
            </div>
          </div>
          <Card className="border-emerald-300/20 bg-white/[0.06] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-300" /> Oferta Fundadores 100</CardTitle>
              <CardDescription className="text-slate-300">Uma oferta simples para acelerar as primeiras vendas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2"><span className="text-5xl font-bold">R$ 49,90</span><span className="pb-1 text-slate-400">/mês</span></div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Starter normalmente a R$ 99/mês. Os primeiros 100 clientes originados por parceiros podem travar o preço fundador de R$ 49,90 enquanto mantiverem a assinatura ativa.</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-300">
                <strong className="text-white">Parceiro:</strong> 30% sobre o valor efetivamente pago, por até 12 meses.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 md:grid-cols-3">
          {[
            [MousePointerClick, "Código e link próprios", "Cada parceiro recebe um código rastreável e um link para divulgar."],
            [WalletCards, "Painel de vendas", "Acompanhe cliques, indicações, clientes pagos e comissões."],
            [ShieldCheck, "Comissão auditável", "Cada comissão nasce de um pagamento confirmado pela Woovi e fica registrada no painel."],
          ].map(([Icon, title, description]: any) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><Icon className="h-6 w-6 text-emerald-300" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div>)}
        </div>
      </section>
    </div>
  );
}

export default function Parceiros() {
  const { user, loading } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [socialHandle, setSocialHandle] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [payoutPixKey, setPayoutPixKey] = useState("");\n  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [adminPartners, setAdminPartners] = useState<AdminPartner[] | null>(null);

  const load = async () => {
    if (!user) return;
    setLoadingDashboard(true);
    try {
      const response = await authFetch("/api/partners/me");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o painel.");
      setDashboard(payload);

      const adminResponse = await authFetch("/api/partners/admin/list");
      if (adminResponse.ok) {
        const adminPayload = await adminResponse.json();
        setAdminPartners(adminPayload.partners || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Não foi possível carregar parceiros.");
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => { void load(); }, [user?.id]);

  const primaryCode = dashboard?.codes?.[0];
  const metrics = dashboard?.metrics;
  const pendingAdmin = useMemo(() => (adminPartners || []).filter(item => item.status === "pending"), [adminPartners]);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await authFetch("/api/partners/apply", {
        method: "POST",
        body: JSON.stringify({
          displayName,
          socialHandle: socialHandle || null,
          socialUrl: socialUrl || null,
          audienceSize: audienceSize ? Number(audienceSize) : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar sua inscrição.");
      toast.success("Inscrição enviada. Vamos liberar seu código após a aprovação.");
      await load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const savePix = async () => {
    try {
      const response = await authFetch("/api/partners/payout", { method: "PATCH", body: JSON.stringify({ payoutPixKey }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar a chave Pix.");
      setPayoutPixKey("");
      toast.success("Chave Pix cadastrada.");
      await load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const approve = async (id: number) => {
    const response = await authFetch(`/api/partners/admin/${id}/approve`, { method: "POST", body: "{}" });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.error || "Não foi possível aprovar.");
    toast.success(`Parceiro aprovado. Código: ${payload.code}`);
    await load();
  };

  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <PublicProgram />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <Badge className="mb-4 border-emerald-300/30 bg-emerald-400/10 text-emerald-200"><Megaphone className="mr-2 h-4 w-4" />Parceiros</Badge>
          <h1 className="text-3xl font-bold">Programa de Parceiros SindCopilot</h1>
          <p className="mt-2 text-slate-300">Indicações, códigos, vendas e comissões em um único painel.</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {loadingDashboard ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : !dashboard?.profile ? (
          <>
            <PublicProgram />
            <Card>
              <CardHeader><CardTitle>Solicitar habilitação</CardTitle><CardDescription>Conte onde você fala com síndicos e gestores condominiais.</CardDescription></CardHeader>
              <CardContent>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={apply}>
                  <div><Label>Nome do canal / perfil</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>
                  <div><Label>@perfil</Label><Input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@seuperfil" /></div>
                  <div><Label>Link principal</Label><Input type="url" value={socialUrl} onChange={e => setSocialUrl(e.target.value)} placeholder="https://..." /></div>
                  <div><Label>Audiência aproximada</Label><Input type="number" min="0" value={audienceSize} onChange={e => setAudienceSize(e.target.value)} /></div>
                  <label className="md:col-span-2 flex items-start gap-3 rounded-xl border bg-slate-50 p-4 text-sm"><Checkbox checked={acceptedTerms} onCheckedChange={value=>setAcceptedTerms(value===true)} /><span>Li e aceito os <Link href="/parceiros/termos" className="font-medium text-blue-600 underline">Termos do Programa de Parceiros</Link>, incluindo atribuição, comissão, prazo de elegibilidade e regras contra autoindicação/fraude.</span></label>\n                  <div className="md:col-span-2"><Button>Enviar para aprovação</Button></div>
                </form>
              </CardContent>
            </Card>
          </>
        ) : dashboard.profile.status !== "active" ? (
          <Card>
            <CardHeader><CardTitle>Habilitação: {dashboard.profile.status === "pending" ? "em análise" : dashboard.profile.status}</CardTitle><CardDescription>Seu painel comercial será liberado assim que sua parceria estiver ativa.</CardDescription></CardHeader>
            <CardContent><div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Comissão proposta: {dashboard.profile.commissionPercent}% por {dashboard.profile.commissionMonths} meses.</div></CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [MousePointerClick, "Cliques", metrics?.clicks || 0],
                [Users, "Indicações", metrics?.leads || 0],
                [CheckCircle2, "Clientes pagos", metrics?.paidCustomers || 0],
                [DollarSign, "Comissão acumulada", money((metrics?.pendingCommissionCents || 0) + (metrics?.approvedCommissionCents || 0) + (metrics?.paidCommissionCents || 0))],
              ].map(([Icon, label, value]: any) => <Card key={label}><CardContent className="p-5"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>)}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Seu link de divulgação</CardTitle><CardDescription>Use o link ou o código em vídeos, posts, grupos e aulas.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {primaryCode ? <>
                    <div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-xs uppercase tracking-wider text-slate-400">Código</p><p className="mt-1 text-2xl font-bold">{primaryCode.code}</p></div>
                    <div className="flex gap-2"><Input readOnly value={primaryCode.shareUrl} /><Button variant="outline" onClick={async()=>{await navigator.clipboard.writeText(primaryCode.shareUrl);toast.success("Link copiado.");}}><Copy className="h-4 w-4" /></Button></div>
                    <Button asChild variant="outline"><a href={primaryCode.shareUrl} target="_blank" rel="noreferrer">Testar meu link <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
                  </> : <p className="text-sm text-muted-foreground">Seu código está sendo preparado.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Oferta para sua audiência</CardTitle><CardDescription>Campanha compartilhada entre parceiros ativos.</CardDescription></CardHeader>
                <CardContent>
                  {dashboard.campaign ? <>
                    <div className="flex items-center gap-3"><BadgePercent className="h-6 w-6 text-emerald-600" /><div><p className="font-semibold">{money(dashboard.campaign.promoPriceCents)}/mês</p><p className="text-sm text-muted-foreground">Starter regular {money(dashboard.campaign.regularPriceCents)}/mês</p></div></div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (dashboard.campaign.reservedCount / dashboard.campaign.maxRedemptions) * 100)}%` }} /></div>
                    <p className="mt-2 text-sm text-muted-foreground">{dashboard.campaign.remaining} vaga(s) restantes da campanha Fundadores 100.</p>
                  </> : <p className="text-sm text-muted-foreground">Nenhuma campanha ativa.</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Recebimento das comissões</CardTitle><CardDescription>Comissão padrão de {dashboard.profile.commissionPercent}% por até {dashboard.profile.commissionMonths} meses sobre pagamentos confirmados.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]"><Input placeholder={dashboard.profile.payoutPixKeyMasked || "Sua chave Pix"} value={payoutPixKey} onChange={e=>setPayoutPixKey(e.target.value)} /><Button onClick={savePix}>Salvar chave Pix</Button></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Vendas e comissões recentes</CardTitle><CardDescription>Sem expor dados pessoais dos clientes indicados.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {!dashboard.commissions?.length ? <p className="py-8 text-center text-sm text-muted-foreground">As vendas confirmadas aparecerão aqui.</p> : dashboard.commissions.slice(0,20).map(item => <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Venda confirmada · {money(item.paymentValueCents)}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR")} · comissão {item.commissionPercent}%</p></div><div className="text-right"><p className="font-semibold text-emerald-700">{money(item.commissionValueCents)}</p><Badge variant="secondary">{item.status}</Badge></div></div>)}
              </CardContent>
            </Card>
          </>
        )}

        {adminPartners && (
          <Card className="border-blue-200">
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-600" />Administração de parceiros</CardTitle><CardDescription>{pendingAdmin.length} solicitação(ões) aguardando aprovação.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {!pendingAdmin.length ? <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p> : pendingAdmin.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-semibold">{item.displayName}</p><p className="text-sm text-muted-foreground">{item.email || "sem email"} {item.socialHandle ? `· ${item.socialHandle}` : ""}</p>{item.socialUrl && <a className="text-sm text-blue-600 underline" href={item.socialUrl} target="_blank" rel="noreferrer">{item.socialUrl}</a>}</div><Button onClick={()=>approve(item.id)}>Aprovar 30%</Button></div>)}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
