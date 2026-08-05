import { Building2, CheckCircle2, ExternalLink, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPPORT_EMAIL = "henriquecampos66@gmail.com";
const DELETE_SUBJECT = "Solicitação de exclusão de conta SindCopilot";
const DELETE_BODY = `Olá, solicito a exclusão permanente da minha conta e dos dados associados ao SindCopilot.\n\nE-mail cadastrado: \nNome: \n\nConfirmo que compreendo que a ação é irreversível.`;

const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(DELETE_SUBJECT)}&body=${encodeURIComponent(DELETE_BODY)}`;

export default function ExclusaoConta() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xl font-bold">SindCopilot</p>
            <p className="text-sm text-slate-500">Aplicativo Android: com.sindcopilot.app</p>
          </div>
        </a>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
              <Trash2 className="h-7 w-7 text-rose-600" /> Exclusão de conta e dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-7 text-sm leading-6 text-slate-600">
            <p>
              Esta é a página pública oficial para usuários do <strong className="text-slate-900">SindCopilot</strong>
              solicitarem a exclusão permanente da conta e dos dados associados, inclusive sem ter o aplicativo instalado.
            </p>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Opção 1 — excluir imediatamente com login
              </h2>
              <p className="mt-2">
                Entre no painel web ou no aplicativo e acesse <strong>Meu Perfil → Excluir conta</strong>. A exclusão exige
                sessão autenticada e a confirmação digitando <strong>EXCLUIR</strong>.
              </p>
              <Button className="mt-4" asChild><a href="/login?redirect=%2Fperfil">Entrar e excluir minha conta</a></Button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Mail className="h-5 w-5 text-blue-600" /> Opção 2 — solicitar sem acessar a conta
              </h2>
              <p className="mt-2">
                Envie a solicitação a partir do mesmo e-mail usado no cadastro. Isso permite validar sua identidade e
                evita que terceiros apaguem sua conta indevidamente.
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <a href={mailto}>Enviar solicitação para {SUPPORT_EMAIL}</a>
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                Assunto: “{DELETE_SUBJECT}”. Inclua o e-mail cadastrado e confirme que deseja a exclusão permanente.
              </p>
            </section>

            <section className="rounded-2xl bg-rose-50 p-5 text-rose-950">
              <h2 className="font-semibold">Dados removidos após a confirmação</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>conta de autenticação, perfil e consentimentos;</li>
                <li>condomínios, unidades e dados operacionais vinculados à conta proprietária;</li>
                <li>documentos, fotos, arquivos privados, textos extraídos e índices de busca;</li>
                <li>visitas, checklists, ocorrências, pendências, obrigações e relatórios;</li>
                <li>fornecedores, notificações, atividades, mensagens do assistente e dados de uso;</li>
                <li>convites e acessos concedidos pela conta proprietária.</li>
              </ul>
            </section>

            <section className="rounded-2xl bg-amber-50 p-5 text-amber-950">
              <h2 className="font-semibold">Assinatura e registros que podem ser conservados</h2>
              <p className="mt-2">
                Quando existir uma assinatura Woovi vinculada à conta proprietária, o sistema tenta cancelá-la antes da
                exclusão para impedir novas cobranças. Se o provedor estiver indisponível, a exclusão não será concluída e
                o usuário receberá orientação para contatar o suporte.
              </p>
              <p className="mt-2">
                Registros mínimos de cobrança, segurança, prevenção a fraude, auditoria ou obrigações legais podem ser
                mantidos pelo prazo necessário. Backups e logs podem permanecer temporariamente até o ciclo normal de
                sobrescrita dos provedores.
              </p>
            </section>

            <section className="rounded-2xl bg-emerald-50 p-5 text-emerald-950">
              <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Processo seguro e irreversível</h2>
              <p className="mt-2">
                A solicitação pode exigir confirmação de identidade. Após a conclusão, os dados removidos não poderão ser
                recuperados. Usuários ajudantes independentes podem manter a própria conta, mas perdem o acesso aos dados
                da conta proprietária excluída.
              </p>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" asChild><a href="/privacidade">Política de Privacidade</a></Button>
              <Button variant="ghost" asChild><a href="/termos">Termos de Uso <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
