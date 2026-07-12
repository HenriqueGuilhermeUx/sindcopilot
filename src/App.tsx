import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DashboardLayout from "@/components/DashboardLayout";

const Landing = lazy(() => import("@/pages/Landing"));
const Home = lazy(() => import("@/pages/Home"));
const Condominios = lazy(() => import("@/pages/Condominios"));
const CondominioDetail = lazy(() => import("@/pages/CondominioDetail"));
const Documentos = lazy(() => import("@/pages/Documentos"));
const Compliance = lazy(() => import("@/pages/Compliance"));
const Notificacoes = lazy(() => import("@/pages/Notificacoes"));
const Fornecedores = lazy(() => import("@/pages/Fornecedores"));
const Assistente = lazy(() => import("@/pages/Assistente"));
const Planos = lazy(() => import("@/pages/Planos"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const Ajudantes = lazy(() => import("@/pages/Ajudantes"));
const Termos = lazy(() => import("@/pages/Termos"));
const Privacidade = lazy(() => import("@/pages/Privacidade"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Invite = lazy(() => import("@/pages/Invite"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Carregando SindCopilot…
    </div>
  );
}

function Private({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Suspense fallback={<LoadingScreen />}>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/cadastro" component={Register} />
              <Route path="/convite/:token" component={Invite} />
              <Route path="/termos" component={Termos} />
              <Route path="/privacidade" component={Privacidade} />
              <Route path="/dashboard">{() => <Private><Home /></Private>}</Route>
              <Route path="/condominios/:id">{() => <Private><CondominioDetail /></Private>}</Route>
              <Route path="/condominios">{() => <Private><Condominios /></Private>}</Route>
              <Route path="/documentos">{() => <Private><Documentos /></Private>}</Route>
              <Route path="/compliance">{() => <Private><Compliance /></Private>}</Route>
              <Route path="/notificacoes">{() => <Private><Notificacoes /></Private>}</Route>
              <Route path="/fornecedores">{() => <Private><Fornecedores /></Private>}</Route>
              <Route path="/assistente">{() => <Private><Assistente /></Private>}</Route>
              <Route path="/planos">{() => <Private><Planos /></Private>}</Route>
              <Route path="/perfil">{() => <Private><Perfil /></Private>}</Route>
              <Route path="/ajudantes">{() => <Private><Ajudantes /></Private>}</Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
