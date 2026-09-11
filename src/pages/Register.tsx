import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/runtime";

const LGPD_VERSION = "2.1";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [, setLocation] = useLocation();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accepted) return toast.error("Aceite os Termos e a Política de Privacidade");
    if (password.length < 8) return toast.error("Use uma senha com pelo menos 8 caracteres");

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          accepted_terms: true,
          lgpd_version: LGPD_VERSION,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setPending(false);

    if (error) return toast.error(error.message);
    if (data.session) setLocation("/dashboard");
    else toast.success("Confira seu email para confirmar o cadastro");
  };

  if (isNativeApp) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_62%)]" />
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
            className="mb-7 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <section className="flex flex-1 flex-col justify-center pb-8">
            <div className="mb-7">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-[20px] bg-white text-slate-950 shadow-xl shadow-black/20">
                <Building2 className="h-7 w-7" strokeWidth={2.2} />
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em]">Comece pelo essencial.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Crie sua conta e organize a operação condominial em um só lugar.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="native-name" className="text-sm text-slate-300">Nome</Label>
                <Input
                  id="native-name"
                  autoComplete="name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] px-4 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="native-register-email" className="text-sm text-slate-300">Email</Label>
                <Input
                  id="native-register-email"
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
                <Label htmlFor="native-register-password" className="text-sm text-slate-300">Senha</Label>
                <Input
                  id="native-register-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] px-4 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  placeholder="Mínimo de 8 caracteres"
                  required
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 text-xs leading-5 text-slate-400">
                <Checkbox checked={accepted} onCheckedChange={value => setAccepted(value === true)} className="mt-0.5" />
                <span>
                  Li e aceito os <Link href="/termos" className="font-medium text-white underline underline-offset-2">Termos de Uso</Link> e a{" "}
                  <Link href="/privacidade" className="font-medium text-white underline underline-offset-2">Política de Privacidade</Link>.
                </span>
              </label>

              <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={pending}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar conta"}
              </Button>
            </form>
          </section>

          <p className="text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-white">Entrar</Link>
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
          <CardTitle>Crie sua conta</CardTitle>
          <CardDescription>Teste grátis por 7 dias, sem cartão.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Nome</Label><Input value={name} onChange={event => setName(event.target.value)} required /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={accepted} onCheckedChange={value => setAccepted(value === true)} />
              <span>
                Li e aceito os <Link href="/termos" className="text-primary underline">Termos de Uso</Link> e a{" "}
                <Link href="/privacidade" className="text-primary underline">Política de Privacidade</Link> versão {LGPD_VERSION}.
              </span>
            </label>
            <Button className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta? <Link href="/login" className="font-medium text-primary">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
