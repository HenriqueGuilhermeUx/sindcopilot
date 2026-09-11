import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/lib/runtime";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const redirect = new URLSearchParams(search).get("redirect") || "/dashboard";

  useEffect(() => {
    if (user) setLocation(redirect, { replace: true });
  }, [user, redirect, setLocation]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) return toast.error(error.message);
    setLocation(redirect);
  };

  const magic = async () => {
    if (!email) return toast.error("Informe seu email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirect}` },
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de acesso para seu email");
  };

  if (isNativeApp) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.24),transparent_62%)]" />
        <div
          className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6"
          style={{
            paddingTop: "max(24px, env(safe-area-inset-top))",
            paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="mb-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <section className="flex flex-1 flex-col justify-center pb-8">
            <div className="mb-8">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-[20px] bg-white text-slate-950 shadow-xl shadow-black/20">
                <Building2 className="h-7 w-7" strokeWidth={2.2} />
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em]">Bem-vindo de volta.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Entre para continuar a operação dos seus condomínios.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="native-email" className="text-sm text-slate-300">Email</Label>
                <Input
                  id="native-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] px-4 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  placeholder="voce@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="native-password" className="text-sm text-slate-300">Senha</Label>
                <Input
                  id="native-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] px-4 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  placeholder="Sua senha"
                  required
                />
              </div>

              <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={pending}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-13 w-full rounded-2xl border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
                onClick={magic}
              >
                Receber link por email
              </Button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Acesso protegido e dados sincronizados
            </div>
          </section>

          <p className="text-center text-sm text-slate-500">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-white">Criar conta</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary/10">
            <Building2 className="text-primary" />
          </div>
          <CardTitle>Entrar no SindCopilot</CardTitle>
          <CardDescription>Acesse a operação dos seus condomínios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></div>
            <Button className="w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={magic}>Receber link por email</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">Ainda não tem conta? <Link href="/cadastro" className="font-medium text-primary">Criar conta</Link></p>
          <p className="mt-3 text-center text-xs"><Link href="/" className="text-muted-foreground">Voltar ao site</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
