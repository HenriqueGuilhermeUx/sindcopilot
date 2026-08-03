import { Building2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPPORT_EMAIL = "henriquecampos66@gmail.com";

export default function ExclusaoConta() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xl font-bold">SindCopilot</p>
            <p className="text-sm text-slate-500">Exclusão de conta e dados</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Trash2 className="h-6 w-6 text-rose-600" /> Excluir sua conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-slate-600">
            <p>
              Usuários do SindCopilot podem excluir a conta diretamente pelo aplicativo ou pelo painel web em
              <strong className="text-slate-900"> Meu perfil → Privacidade e conta → Excluir conta</strong>.
            </p>
            <div className="rounded-2xl bg-rose-50 p-4 text-rose-900">
              <p className="font-semibold">O que será excluído</p>
              <p className="mt-1">
                Perfil, condomínios vinculados à conta proprietária, unidades, documentos, arquivos, visitas,
                pendências, fornecedores, atividades e histórico do assistente.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
              <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Processo seguro</p>
              <p className="mt-1">
                A exclusão exige uma sessão autenticada e confirmação explícita. A ação é irreversível.
              </p>
            </div>
            <p>
              Caso não consiga acessar sua conta, envie uma solicitação usando o mesmo e-mail cadastrado para
              <a className="ml-1 font-semibold text-blue-700 underline" href={`mailto:${SUPPORT_EMAIL}?subject=Exclusão de conta SindCopilot`}>
                {SUPPORT_EMAIL}
              </a>.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild><a href="/login">Entrar para excluir</a></Button>
              <Button variant="outline" asChild><a href="/privacidade">Política de Privacidade</a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
