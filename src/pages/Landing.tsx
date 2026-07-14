import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  Brain,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Mic,
  Scale,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";

const CONTACT_EMAIL = "henriquecampos66@gmail.com";
const MOBILE_URL = "https://sindcopilot.com/visitas";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const features = [
  {
    icon: Building2,
    title: "Dashboard Multi-Condomínio",
    description: "Visão consolidada de todos os prédios, pendências, documentos e obrigações em uma única tela.",
    color: "text-blue-600 bg-blue-100",
  },
  {
    icon: Smartphone,
    title: "SindCopilot Mobile",
    description: "Leve o Modo Visita no bolso para vistorias, ocorrências, fotos, ditado e relatórios direto do celular.",
    color: "text-cyan-700 bg-cyan-100",
  },
  {
    icon: Camera,
    title: "OCR Inteligente com IA",
    description: "Tire foto da nota fiscal e a IA extrai fornecedor, CNPJ, valor, data e categoria.",
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    icon: Scale,
    title: "Assistente de Convenções e Regimentos",
    description: "Pergunte sobre as regras e receba respostas com indicação do documento, página e trecho utilizados.",
    color: "text-purple-600 bg-purple-100",
  },
  {
    icon: Calendar,
    title: "Agenda de Compliance",
    description: "AVCB, seguros, dedetização e caixa d'água com alertas antecipados e histórico.",
    color: "text-amber-600 bg-amber-100",
  },
  {
    icon: FileText,
    title: "Gerador de Documentos com IA",
    description: "Gere minutas de notificações, advertências ou comunicados para revisão do síndico.",
    color: "text-rose-600 bg-rose-100",
  },
  {
    icon: Users,
    title: "CRM de Fornecedores",
    description: "Sua base privada de prestadores, contatos, avaliações e histórico de serviços.",
    color: "text-cyan-600 bg-cyan-100",
  },
];

const mobileFeatures = [
  [ClipboardCheck, "Checklist de visita", "Faça a vistoria por áreas e marque Conforme, Atenção ou Urgente com um toque."],
  [Camera, "Fotos na hora", "Registre ocorrências pela câmera e mantenha evidências ligadas à visita."],
  [Mic, "Observação por voz", "Dite a ocorrência em vez de parar para digitar durante a vistoria."],
  [WifiOff, "Funciona sem sinal", "Continue trabalhando em garagem e subsolo. O rascunho fica salvo no aparelho."],
  [Calendar, "Pendências automáticas", "Itens com atenção ou urgência podem virar tarefas com prazo no Compliance."],
  [FileText, "Relatório em PDF", "Finalize a visita e gere um relatório profissional para arquivo ou compartilhamento."],
] as const;

const plans = [
  {
    name: "Starter",
    price: "99",
    description: "Para síndicos que gerenciam até 6 condomínios",
    features: [
      "Até 6 condomínios",
      "1 ajudante com acesso",
      "SindCopilot Mobile + Modo Visita",
      "Funcionamento offline em campo",
      "Dashboard consolidado",
      "Gestão documental com OCR",
      "Agenda de compliance com alertas",
      "Gerador de documentos com IA",
      "Assistente jurídico IA",
      "CRM de fornecedores",
      "Exportação em PDF",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "199",
    description: "Para síndicos com carteira expandida",
    features: [
      "Até 16 condomínios",
      "2 ajudantes com acesso",
      "Tudo do plano Starter",
      "Mais capacidade de OCR e IA",
      "Prioridade no suporte",
      "Relatórios avançados",
      "Busca semântica em documentos",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: null,
    description: "Para grandes operações e administradoras",
    features: [
      "Condomínios ilimitados",
      "Até 10 ajudantes",
      "Tudo do plano Pro",
      "Onboarding dedicado",
      "Suporte prioritário",
      "Customizações sob demanda",
    ],
    popular: false,
  },
];

function MobileAppSection() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsInstalled(standalone);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("SindCopilot instalado no seu celular.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (isInstalled) {
      window.location.href = "/visitas";
      return;
    }

    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Instalação iniciada.");
    }
    setInstallPrompt(null);
  };

  const shareToPhone = async () => {
    const shareData = {
      title: "SindCopilot Mobile",
      text: "Abra o SindCopilot Mobile no celular e instale o app para usar o Modo Visita.",
      url: MOBILE_URL,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(MOBILE_URL);
      toast.success("Link copiado. Envie para o seu celular.");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(MOBILE_URL);
          toast.success("Link copiado. Envie para o seu celular.");
        } catch {
          toast.error("Não foi possível compartilhar automaticamente.");
        }
      }
    }
  };

  return (
    <section id="app-mobile" className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.2),transparent_35%)]" />
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Badge className="mb-5 border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
              <Smartphone className="mr-2 h-4 w-4" />
              SindCopilot Mobile
            </Badge>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
              O condomínio não fica no escritório. <span className="text-cyan-300">Seu sistema também não.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Instale o SindCopilot no celular e transforme cada visita em uma vistoria organizada: checklist, fotos,
              ditado, ocorrências, prazos e relatório final — inclusive em locais com sinal ruim.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {mobileFeatures.map(([Icon, title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={install}>
                {isInstalled ? <ArrowRight className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
                {isInstalled ? "Abrir Modo Visita" : "Instalar no celular"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={shareToPhone}
              >
                <Send className="mr-2 h-5 w-5" />
                Enviar para o celular
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100"
                asChild
              >
                <a href="/visitas">Conhecer o Modo Visita</a>
              </Button>
            </div>

            {showInstructions && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-slate-200">
                <p className="font-semibold text-white">Instalação rápida</p>
                <p className="mt-2">
                  <strong>Android/Chrome:</strong> abra o menu do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”.
                </p>
                <p className="mt-2">
                  <strong>iPhone/Safari:</strong> toque em Compartilhar e depois em “Adicionar à Tela de Início”.
                </p>
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[2.5rem] border border-white/15 bg-slate-900 p-3 shadow-2xl shadow-cyan-950/40">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-100 text-slate-900">
                <div className="bg-slate-950 px-5 pb-5 pt-4 text-white">
                  <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-slate-700" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[.2em] text-cyan-300">Modo Visita</p>
                      <p className="mt-1 text-xl font-bold">Condomínio Solar</p>
                    </div>
                    <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300">Offline pronto</div>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    ["Portaria", "Conforme", "bg-emerald-100 text-emerald-700"],
                    ["Garagem", "Atenção", "bg-amber-100 text-amber-700"],
                    ["Casa de máquinas", "Urgente", "bg-rose-100 text-rose-700"],
                  ].map(([area, status, style]) => (
                    <div key={area} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{area}</p>
                            <p className="text-xs text-slate-500">Checklist da visita</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{status}</span>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-blue-600 p-5 text-white">
                    <div className="flex items-center gap-3">
                      <Camera className="h-6 w-6" />
                      <div>
                        <p className="font-semibold">Registrar ocorrência</p>
                        <p className="text-xs text-blue-100">Foto + voz + prioridade + prazo</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-400">Sem loja de aplicativos. Instale direto pelo navegador.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">SindCopilot</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#app-mobile">App Mobile</a>
            <a href="#como-funciona">Como Funciona</a>
            <a href="#planos">Planos</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contato</a>
          </div>
          <Button asChild><a href={getLoginUrl()}>Entrar</a></Button>
        </div>
      </nav>

      <div className="pt-16">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
          <div className="container mx-auto px-4 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-6 border-blue-400/30 bg-blue-500/20 px-4 py-1.5 text-blue-200">
                Plataforma para Síndicos Profissionais
              </Badge>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                Todos os seus condomínios. <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Uma única operação.</span>
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
                Organize documentos, controle obrigações, consulte convenções, gere minutas com IA e leve o Modo Visita no celular para trabalhar dentro do condomínio.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button size="lg" className="bg-blue-600 px-8 py-6 text-lg" asChild>
                  <a href="/cadastro">Começar Agora <ArrowRight className="ml-2 h-5 w-5" /></a>
                </Button>
                <Button size="lg" variant="outline" className="border-slate-500 px-8 py-6 text-lg text-slate-200 hover:bg-slate-800" asChild>
                  <a href="#app-mobile"><Smartphone className="mr-2 h-5 w-5" />Ver App Mobile</a>
                </Button>
              </div>
              <p className="mt-6 text-sm text-slate-400">Teste grátis por 7 dias. Sem cartão de crédito.</p>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
              <h2 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">Tudo que o síndico profissional precisa</h2>
              <p className="text-lg text-slate-600">Do escritório à vistoria em campo, tudo conectado na mesma operação.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-slate-600">{feature.description}</p></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <MobileAppSection />

        <section id="como-funciona" className="bg-slate-50 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <Badge variant="outline" className="mb-4">Como Funciona</Badge>
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Simples de começar, poderoso de usar</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Cadastre seus condomínios", "Adicione os prédios que você administra."],
                ["02", "Organize documentos e prazos", "Convenções, regimentos, atas, notas e compliance."],
                ["03", "Instale o app no celular", "Use o Modo Visita durante vistorias e ocorrências."],
                ["04", "Centralize a operação", "Campo, IA, documentos, pendências e relatórios no mesmo lugar."],
              ].map(([number, title, description]) => (
                <div key={number} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">{number}</div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 md:text-4xl">O síndico que usa IA e mobilidade sai na frente</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Clock, "Recupere horas da sua semana"],
                [Shield, "Reduza o risco de perder prazos"],
                [Brain, "IA que entende cada condomínio"],
                [Zap, "Minutas em poucos cliques"],
                [Camera, "Vistoria com evidência no celular"],
                [Star, "Gestão profissional em campo e no escritório"],
              ].map(([Icon, title]: any) => (
                <div key={title} className="flex gap-4 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><Icon className="h-5 w-5" /></div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="bg-slate-50 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <Badge variant="outline" className="mb-4">Planos</Badge>
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Painel web e app mobile no mesmo plano</h2>
              <p className="mt-3 text-slate-600">O Modo Visita faz parte do SindCopilot. Não há cobrança separada pelo app.</p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? "border-2 border-blue-500 shadow-xl" : ""}`}>
                  {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 text-center">
                    <div className="mb-6">
                      {plan.price ? (
                        <div><span className="text-sm">R$</span><span className="text-5xl font-bold text-slate-900">{plan.price}</span><span>/mês</span></div>
                      ) : (
                        <div className="text-3xl font-bold text-slate-900">Sob Consulta</div>
                      )}
                    </div>
                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                      <a href={plan.price ? "/cadastro" : `mailto:${CONTACT_EMAIL}`}>{plan.price ? `Começar com ${plan.name}` : "Falar com Vendas"}</a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-blue-700 py-20 text-center text-white">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-blue-200" />
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Do escritório à vistoria. Uma única operação.</h2>
          <p className="mx-auto mb-8 max-w-2xl text-blue-100">Comece no painel, instale o app no celular e leve o SindCopilot para dentro de cada condomínio.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-white text-blue-700" asChild><a href="/cadastro">Começar Agora Grátis</a></Button>
            <Button size="lg" variant="outline" className="border-blue-300 text-white hover:bg-blue-600" asChild><a href="#app-mobile"><Smartphone className="mr-2 h-5 w-5" />Ver App Mobile</a></Button>
          </div>
        </section>

        <footer className="bg-slate-900 py-12 text-slate-400">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center gap-2"><Building2 className="h-6 w-6 text-blue-400" /><span className="text-xl font-bold text-white">SindCopilot</span></div>
            <p className="text-sm">Plataforma inteligente para síndicos profissionais — no escritório e no celular.</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <a href={`mailto:${CONTACT_EMAIL}`}><Mail className="inline h-3 w-3" /> {CONTACT_EMAIL}</a>
              <a href="#app-mobile">App Mobile</a>
              <a href="/termos">Termos</a>
              <a href="/privacidade">Privacidade</a>
            </div>
            <p className="mt-8 text-sm">© {new Date().getFullYear()} SindCopilot.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
