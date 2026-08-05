import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Crown, ExternalLink, Loader2, Save, Shield, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { apiUrl, isNativeApp } from "@/lib/runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const CONTACT_EMAIL = "henriquecampos66@gmail.com";
const LGPD_VERSION = "2.0";

export default function Perfil() {
  const { user, session, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const profile = trpc.profile.get.useQuery(undefined, { enabled: !!user });
  const updateProfile = trpc.profile.update.useMutation();
  const acceptLgpd = trpc.profile.acceptLgpd.useMutation();
  const billingStatus = trpc.billing.status.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", cpf: "", creci: "", company: "" });
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      name: profile.data.name || "",
      phone: profile.data.phone || "",
      cpf: profile.data.cpf || "",
      creci: profile.data.creci || "",
      company: profile.data.company || "",
    });
    if (profile.data.lgpdConsentAt) setLgpdAccepted(true);
    if (profile.data.termsAcceptedAt) setTermsAccepted(true);
  }, [profile.data]);

  const save = async () => {
    if (!lgpdAccepted || !termsAccepted) return toast.error("Aceite os Termos e a Política de Privacidade");
    try {
      if (!profile.data?.lgpdConsentAt) await acceptLgpd.mutateAsync({ version: LGPD_VERSION });
      await updateProfile.mutateAsync(form);
      await utils.profile.get.invalidate();
      toast.success("Perfil atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    }
  };

  const deleteAccount = async () => {
    const confirmation = window.prompt(
      "Esta ação cancela a assinatura vinculada quando aplicável e exclui permanentemente sua conta e os dados associados. Digite EXCLUIR para confirmar.",
    );
    if (confirmation !== "EXCLUIR") return;
    if (!session?.access_token) return toast.error("Sua sessão expirou. Entre novamente.");

    setDeleting(true);
    try {
      const response = await fetch(apiUrl("/api/account"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível excluir a conta");
      await signOut().catch(() => undefined);
      toast.success("Conta excluída com sucesso");
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível excluir a conta");
    } finally {
      setDeleting(false);
    }
  };

  const plan = billingStatus.data?.plan || "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie seus dados, privacidade e acesso.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Plano Atual</CardTitle>
            <Badge>{plan}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{billingStatus.data?.maxCondominiums || 1} condomínios | {billingStatus.data?.maxAssistants || 0} ajudantes</span>
          {!isNativeApp && <Button variant="outline" size="sm" asChild><a href="/planos">Alterar Plano</a></Button>}
          {isNativeApp && <span className="text-xs text-muted-foreground">A assinatura é gerenciada no painel web do SindCopilot.</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-blue-600" />Dados Pessoais</CardTitle>
          <CardDescription>Informações do síndico profissional</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["name", "Nome Completo", form.name],
              ["phone", "Telefone / WhatsApp", form.phone],
              ["cpf", "CPF", form.cpf],
              ["creci", "CRECI / Registro", form.creci],
              ["company", "Empresa / Razão Social", form.company],
            ].map(([key, label, value]) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input id={key} value={value} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
              </div>
            ))}
            <div className="space-y-2"><Label>Email</Label><Input value={profile.data?.email || ""} disabled /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-600" />Privacidade e Consentimento</CardTitle>
          <CardDescription>Transparência e controle dos seus dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><a href="/privacidade">Política de Privacidade <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>
            <Button variant="outline" size="sm" asChild><a href="/termos">Termos de Uso <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>
            <Button variant="outline" size="sm" asChild><a href="/exclusao-de-conta">Como funciona a exclusão <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>
          </div>

          {profile.data?.lgpdConsentAt ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />Consentimento registrado em {new Date(profile.data.lgpdConsentAt).toLocaleDateString("pt-BR")}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Seus dados são tratados para prestar o serviço. Direitos podem ser solicitados em {CONTACT_EMAIL}.</p>
              <label className="flex gap-3 text-sm">
                <Checkbox checked={lgpdAccepted} onCheckedChange={checked => setLgpdAccepted(!!checked)} />
                <span>Li e aceito a <a className="font-medium text-blue-700 underline" href="/privacidade">Política de Privacidade</a>.</span>
              </label>
              <label className="flex gap-3 text-sm">
                <Checkbox checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(!!checked)} />
                <span>Li e aceito os <a className="font-medium text-blue-700 underline" href="/termos">Termos de Uso</a>.</span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-700"><Trash2 className="h-5 w-5" />Excluir conta</CardTitle>
          <CardDescription>Cancela a assinatura vinculada quando aplicável e exclui permanentemente o perfil e os dados associados.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-muted-foreground">A ação é irreversível. Documentos, visitas, condomínios e históricos vinculados serão removidos, ressalvados registros mínimos cuja retenção seja legalmente necessária.</p>
          <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={updateProfile.isPending || acceptLgpd.isPending}>
          {updateProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Perfil
        </Button>
      </div>
    </div>
  );
}
