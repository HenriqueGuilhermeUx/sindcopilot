import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Crown, Sparkles, QrCode } from "lucide-react";
import { toast } from "sonner";

const CONTACT_EMAIL = "henriquecampos66@gmail.com";
const plans = [
  { key:"starter" as const,name:"Starter",price:"99",description:"Para síndicos que gerenciam até 6 condomínios",features:["Até 6 condomínios","1 ajudante com acesso","Dashboard consolidado","Gestão documental com OCR","Agenda de compliance","Gerador de minutas com IA","Assistente documental","CRM de fornecedores","Exportação em PDF"],popular:false },
  { key:"pro" as const,name:"Pro",price:"199",description:"Para síndicos com carteira expandida",features:["Até 16 condomínios","2 ajudantes com acesso","Tudo do plano Starter","Prioridade no suporte","Relatórios avançados","Busca semântica em documentos"],popular:true },
  { key:"scale" as const,name:"Scale",price:null,description:"Para grandes operações e administradoras",features:["Condomínios ilimitados","Até 10 ajudantes","Tudo do plano Pro","Onboarding dedicado","Suporte prioritário","Customizações sob demanda"],popular:false },
];

export default function Planos() {
  const { user } = useAuth();
  const billing = trpc.billing.status.useQuery(undefined, { enabled: !!user });
  const checkout = trpc.billing.checkout.useMutation();
  const currentPlan = billing.data?.plan || "free";
  const wooviStatus = billing.data?.stripeStatus;

  const subscribe = async (plan: "starter" | "pro") => {
    try {
      const result = await checkout.mutateAsync({ plan });
      toast.success("Assinatura Pix criada pela Woovi. Conclua a cobrança para ativar o plano.");
      if (result.url) window.location.href = result.url;
      await billing.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar a assinatura Pix");
    }
  };

  const currentLabel = currentPlan === "trial" ? "Teste de 7 dias" : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  return <div className="min-h-screen bg-slate-50 py-12 px-4"><div className="max-w-5xl mx-auto">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Escolha seu plano</h1>
      <p className="text-slate-600">{currentPlan !== "free" ? <span className="flex items-center justify-center gap-2"><Crown className="h-4 w-4 text-amber-500"/>Você está no plano <Badge variant="secondary">{currentLabel}</Badge></span> : "Invista menos do que uma hora de consultoria por mês."}</p>
      {wooviStatus === "pending" && <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"><QrCode className="h-4 w-4"/>Assinatura criada. Aguardando o primeiro pagamento Pix pela Woovi.</div>}
    </div>
    <div className="grid md:grid-cols-3 gap-8">{plans.map(plan => { const isCurrent = currentPlan === plan.key; return <Card key={plan.key} className={`relative flex flex-col ${plan.popular ? "border-blue-500 border-2 shadow-xl" : "border-slate-200"}`}>
      {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">Mais Popular</Badge>}
      {isCurrent && <Badge className="absolute -top-3 right-4 bg-emerald-600">Seu Plano</Badge>}
      <CardHeader className="text-center"><CardTitle className="text-2xl">{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription></CardHeader>
      <CardContent className="text-center flex-1"><div className="mb-6">{plan.price ? <div className="flex items-baseline justify-center gap-1"><span className="text-sm text-slate-500">R$</span><span className="text-5xl font-bold text-slate-900">{plan.price}</span><span className="text-slate-500">/mês</span></div> : <div className="text-3xl font-bold text-slate-900 py-2">Sob Consulta</div>}</div><ul className="space-y-3 text-left">{plan.features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0"/><span className="text-slate-700">{feature}</span></li>)}</ul></CardContent>
      <CardFooter>{isCurrent ? <Button className="w-full" variant="secondary" disabled><Sparkles className="h-4 w-4 mr-2"/>Plano Atual</Button> : plan.price ? <Button className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`} variant={plan.popular ? "default" : "outline"} onClick={() => subscribe(plan.key as "starter" | "pro")} disabled={checkout.isPending}>{checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <QrCode className="h-4 w-4 mr-2"/>}Assinar com Pix</Button> : <Button className="w-full" variant="outline" asChild><a href={`mailto:${CONTACT_EMAIL}?subject=SindCopilot%20Scale`}>Falar com Vendas</a></Button>}</CardFooter>
    </Card>})}</div>
    <div className="mt-8 text-center text-sm text-slate-500"><p>Pagamentos e recorrência processados por Pix via Woovi.</p><p className="mt-1">Mantenha nome, CPF e telefone atualizados no Perfil antes de assinar.</p></div>
  </div></div>;
}
