import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = "henriquecampos66@gmail.com";
const EFFECTIVE_DATE = "4 de agosto de 2026";

export default function Termos() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-cyan-300">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-xl">SindCopilot</span>
          </a>
          <Button variant="outline" asChild><a href="/privacidade">Privacidade</a></Button>
        </div>
      </nav>

      <article className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Termos de Uso do SindCopilot</h1>
          <p className="mt-4 text-slate-600">Aplicáveis ao site, painel web e aplicativo Android <strong>com.sindcopilot.app</strong>.</p>
          <p className="mt-2 text-sm text-slate-500">Versão 2.0 — vigente desde {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate max-w-none rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <section><h2>1. Aceitação</h2><p>Ao criar uma conta ou usar o SindCopilot, você concorda com estes Termos e com a Política de Privacidade. Caso não concorde, não utilize o serviço.</p></section>
          <section><h2>2. Finalidade do serviço</h2><p>O SindCopilot oferece ferramentas de produtividade e gestão condominial, incluindo cadastro de condomínios, documentos, vistorias, checklists, obrigações, fornecedores, comunicações, relatórios e recursos de inteligência artificial.</p></section>
          <section><h2>3. Elegibilidade e conta</h2><p>O serviço é destinado a profissionais e organizações. O usuário deve fornecer informações verdadeiras, manter seus dados atualizados, proteger suas credenciais e responder pelas atividades realizadas pela própria conta e pelos acessos concedidos a ajudantes.</p></section>
          <section><h2>4. Dados de terceiros</h2><p>Ao inserir dados de moradores, proprietários, fornecedores, funcionários ou outros terceiros, o usuário declara possuir base legal e autorização adequada para esse tratamento, comprometendo-se a usar a plataforma de forma compatível com a LGPD e demais normas aplicáveis.</p></section>
          <section><h2>5. Planos, cobrança e cancelamento</h2><p>Planos pagos podem ser cobrados de forma recorrente por Pix por meio da Woovi. A ativação depende da confirmação do pagamento. Valores, limites e condições vigentes são exibidos antes da contratação. Na exclusão da conta proprietária, o sistema tenta cancelar a assinatura vinculada antes de remover os dados. Dificuldades devem ser comunicadas ao suporte.</p></section>
          <section><h2>6. Uso permitido</h2><p>É proibido usar o SindCopilot para fraude, violação de direitos, acesso indevido, envio de código malicioso, sobrecarga intencional, raspagem abusiva, engenharia reversa ilícita ou tratamento de dados sem base legal.</p></section>
          <section><h2>7. Inteligência artificial e revisão humana</h2><p>OCR, classificações, respostas e minutas podem conter erros, omissões ou interpretações inadequadas. Todo conteúdo deve ser revisado antes de uso. O SindCopilot não substitui advogado, contador, engenheiro, administradora, autoridade pública ou outro profissional habilitado.</p></section>
          <section><h2>8. Arquivos e propriedade intelectual</h2><p>O usuário mantém os direitos sobre o conteúdo que envia e concede ao SindCopilot autorização limitada para armazenar e processar esse conteúdo exclusivamente para prestar o serviço. A marca, o software, a interface e os materiais próprios do SindCopilot permanecem protegidos.</p></section>
          <section><h2>9. Disponibilidade e mudanças</h2><p>Empregamos esforços razoáveis para manter o serviço disponível, mas podem ocorrer manutenções, falhas de terceiros, indisponibilidades ou alterações de funcionalidades. Não garantimos operação ininterrupta nem resultados específicos.</p></section>
          <section><h2>10. Responsabilidade</h2><p>O usuário é responsável pelas decisões tomadas com base nas informações da plataforma e pela verificação de documentos, prazos, obrigações e comunicações. Na extensão permitida pela lei, não respondemos por danos decorrentes de uso inadequado, dados incorretos inseridos pelo usuário ou falhas de serviços externos fora do nosso controle.</p></section>
          <section><h2>11. Suspensão e encerramento</h2><p>Contas podem ser suspensas em caso de fraude, risco de segurança, violação destes Termos ou obrigação legal. O usuário pode excluir a conta em <strong>Meu Perfil → Excluir conta</strong> ou pela página pública <a href="/exclusao-de-conta">sindcopilot.com/exclusao-de-conta</a>.</p></section>
          <section><h2>12. Privacidade</h2><p>O tratamento de dados pessoais segue a <a href="/privacidade">Política de Privacidade</a>, que integra estes Termos.</p></section>
          <section><h2>13. Legislação aplicável</h2><p>Estes Termos são regidos pela legislação brasileira. Eventuais controvérsias serão tratadas de acordo com as regras legais de competência aplicáveis, inclusive as normas de proteção do consumidor quando incidentes.</p></section>
          <section><h2>14. Contato</h2><p>Dúvidas e solicitações: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>
        </div>
      </article>
    </main>
  );
}
