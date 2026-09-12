import { Building2, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = "henriquecampos66@gmail.com";
const EFFECTIVE_DATE = "12 de setembro de 2026";

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-cyan-300"><Building2 className="h-5 w-5" /></span>
            <span className="text-xl">SindCopilot</span>
          </a>
          <Button variant="outline" asChild><a href="/exclusao-de-conta">Excluir conta</a></Button>
        </div>
      </nav>

      <article className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center gap-3 text-emerald-700"><ShieldCheck className="h-6 w-6" /><span className="font-semibold">Privacidade, transparência e controle dos dados</span></div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Política de Privacidade do SindCopilot</h1>
          <p className="mt-4 text-slate-600">Aplicável ao site, painel web, PWA e aplicativo Android <strong>com.sindcopilot.app</strong>.</p>
          <p className="mt-2 text-sm text-slate-500">Versão 2.2 — vigente desde {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate max-w-none rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <section><h2>1. Quem trata os dados</h2><p>O SindCopilot é uma plataforma de gestão e produtividade para síndicos e operações condominiais. Para dúvidas, solicitações relacionadas à LGPD ou exercício de direitos, o canal oficial é <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>

          <section><h2>2. Escopo desta política</h2><p>Esta política explica quais dados são tratados quando você cria uma conta, usa o painel ou o aplicativo, cadastra condomínios, envia documentos, registra visitas ou ocorrências, importa extratos financeiros, utiliza recursos de inteligência artificial, contrata um plano ou entra em contato com o suporte.</p></section>

          <section>
            <h2>3. Dados que podem ser coletados</h2>
            <h3>Dados de conta e perfil</h3>
            <ul><li>nome, e-mail e identificador da conta;</li><li>telefone, CPF, empresa e registro profissional, quando informados;</li><li>função, permissões, plano contratado, consentimentos e datas de acesso.</li></ul>
            <h3>Conteúdo inserido pelo usuário</h3>
            <ul>
              <li>dados de condomínios, unidades, proprietários, moradores, fornecedores e responsáveis cadastrados pelo usuário;</li>
              <li>documentos, fotos, vídeos, áudios, PDFs, textos, atas, contratos, notas, recibos e respectivos metadados;</li>
              <li>visitas, checklists, ocorrências, relatos, testemunhos, manifestações, pendências, prazos, obrigações, comunicações e relatórios;</li>
              <li>evidências vinculadas a ocorrências, incluindo data, descrição, identificação informada de testemunha/relator e hash criptográfico SHA-256 do arquivo quando aplicável;</li>
              <li>extratos bancários do condomínio enviados pelo usuário, nomes de arquivos, banco/conta informados, datas, descrições de lançamentos, valores, saldos, categorias, subcategorias, regras de classificação, conciliações, fechamentos e balancetes gerados;</li>
              <li>perguntas, comandos e mensagens enviados ao assistente de inteligência artificial.</li>
            </ul>
            <h3>Assinatura e pagamento</h3>
            <ul><li>plano, identificador e status da assinatura, confirmação de cobrança e período de acesso;</li><li>dados necessários à cobrança Pix processada pela Woovi, como nome, e-mail, telefone e CPF/CNPJ.</li></ul>
            <p>O SindCopilot não armazena dados de cartão de crédito.</p>
            <h3>Dados técnicos e de segurança</h3>
            <ul><li>endereço IP, data e horário, navegador, sistema operacional, dispositivo e registros de erro ou acesso;</li><li>ações administrativas, consumo de recursos e eventos necessários a segurança, auditoria, prevenção de fraude e suporte.</li></ul>
          </section>

          <section>
            <h2>4. Permissões do aplicativo e recursos do dispositivo</h2>
            <ul>
              <li><strong>Câmera:</strong> usada somente quando o usuário decide fotografar documentos, vistorias ou evidências de ocorrências.</li>
              <li><strong>Microfone:</strong> usado somente quando o usuário ativa ditado, gravação ou outro recurso de áudio oferecido pela plataforma; o acesso depende de ação do usuário e da permissão do dispositivo.</li>
              <li><strong>Fotos, vídeos e arquivos:</strong> acessados quando o usuário escolhe anexar evidência, documento ou extrato financeiro.</li>
              <li><strong>Notificações:</strong> usadas para alertas operacionais quando habilitadas pelo usuário.</li>
              <li><strong>Internet e estado da rede:</strong> usados para autenticação, sincronização e funcionamento offline/online.</li>
            </ul>
            <p>O aplicativo não solicita acesso à localização em segundo plano, lista de contatos, SMS ou histórico de chamadas.</p>
          </section>

          <section><h2>5. Para que usamos os dados</h2><ul><li>criar, autenticar e administrar contas e permissões;</li><li>entregar as funcionalidades contratadas e sincronizar dados entre web e aplicativo;</li><li>processar documentos, OCR, buscas, relatórios e recursos de inteligência artificial solicitados pelo usuário;</li><li>organizar vistorias, ocorrências, evidências, manifestações, pendências, obrigações, comunicações e histórico operacional;</li><li>importar extratos do condomínio, organizar lançamentos, aplicar regras de classificação, permitir revisão humana, conciliar saldos, fechar períodos e gerar balancetes em PDF;</li><li>permitir rastreabilidade de casos e lançamentos até seus arquivos de origem;</li><li>processar assinaturas, cobranças Pix e confirmação de pagamentos;</li><li>prestar suporte, corrigir falhas, medir limites do plano e proteger a plataforma;</li><li>cumprir obrigações legais, regulatórias, fiscais e exercer direitos em processos.</li></ul></section>

          <section><h2>6. Bases legais</h2><p>Conforme a LGPD, o tratamento pode ocorrer para execução de contrato e procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, prevenção à fraude e segurança, legítimo interesse quando cabível e consentimento nas situações em que ele for necessário. O usuário responsável pela gestão deve possuir base legítima para inserir no SindCopilot dados pessoais de moradores, visitantes, funcionários, fornecedores, testemunhas ou terceiros, inclusive quando tais dados apareçam em descrições de lançamentos bancários.</p></section>

          <section><h2>7. Compartilhamento e operadores</h2><p>Não vendemos dados pessoais e não usamos dados para publicidade comportamental. Para operar o serviço, dados podem ser processados por fornecedores contratados, sempre de acordo com a finalidade do serviço:</p><ul><li><strong>Supabase:</strong> autenticação, banco de dados e armazenamento privado de documentos, evidências e extratos financeiros;</li><li><strong>Render:</strong> hospedagem e execução do backend;</li><li><strong>OpenAI:</strong> processamento de recursos de IA, OCR, embeddings e classificação financeira quando solicitados;</li><li><strong>Woovi:</strong> criação e gestão de cobranças e assinaturas Pix;</li><li><strong>Resend e provedores de e-mail:</strong> mensagens transacionais e suporte, quando habilitados.</li></ul><p>Também poderemos compartilhar informações quando houver obrigação legal, ordem de autoridade competente ou necessidade de proteger direitos, usuários e a segurança da plataforma.</p></section>

          <section><h2>8. Ocorrências, financeiro e inteligência artificial</h2><p>O SindCopilot permite registrar fatos, anexar evidências, indicar regras internas, importar extratos, classificar lançamentos e criar relatórios. Arquivos de evidência e extratos podem receber hash SHA-256 para ajudar a verificar se o conteúdo armazenado corresponde ao arquivo originalmente registrado; esse hash não transforma o SindCopilot em serviço de certificação, perícia, auditoria independente ou ata notarial.</p><p>No Financeiro Inteligente, classificações determinísticas e regras aprendidas podem organizar lançamentos automaticamente. O recurso de <strong>classificação com IA é acionado pelo usuário</strong>; nessa etapa, descrições, direção e valores dos lançamentos pendentes podem ser enviados ao provedor de IA para sugerir categorias. O arquivo bancário completo não é enviado nesse passo específico de classificação, embora PDFs possam exigir processamento/OCR para leitura quando o usuário optar por importar esse formato.</p><p>Documentos, mensagens e informações enviados a funções de IA são processados para entregar a funcionalidade solicitada. OCR, sugestões, verificações, classificações e minutas podem conter erros e devem ser revisados pelo usuário. O SindCopilot não substitui advogado, contador, auditor, engenheiro, administradora ou outro profissional habilitado.</p></section>

          <section><h2>9. Segurança</h2><ul><li>transmissão por HTTPS;</li><li>autenticação por sessão e controle de acesso por conta e condomínio;</li><li>arquivos em armazenamento privado, acessados por URLs temporárias quando necessário;</li><li>hash SHA-256 em arquivos de evidência e extratos quando tecnicamente aplicável;</li><li>segredos administrativos mantidos somente no servidor;</li><li>registros de auditoria, limites de requisição e medidas de prevenção a abuso.</li></ul><p>Nenhum sistema é totalmente imune a incidentes. Caso identifiquemos evento relevante, adotaremos as medidas técnicas, legais e de comunicação aplicáveis.</p></section>

          <section><h2>10. Retenção e exclusão</h2><p>Os dados operacionais permanecem enquanto a conta estiver ativa e pelo tempo necessário à prestação do serviço. Quando a exclusão é confirmada, removemos a conta, o perfil, condomínios, documentos, arquivos privados, evidências de ocorrências, extratos financeiros, lançamentos, regras de classificação, fechamentos, visitas, pendências, fornecedores, mensagens e demais registros vinculados, observadas as relações do banco de dados.</p><p>Podemos conservar registros mínimos de cobrança, segurança, prevenção à fraude, auditoria ou obrigações legais pelo prazo necessário. Backups e logs de infraestrutura podem permanecer temporariamente até o ciclo técnico normal de sobrescrita do provedor.</p><p>A exclusão pode ser iniciada no aplicativo em <strong>Meu Perfil → Excluir conta</strong> ou pela página pública <a href="/exclusao-de-conta">sindcopilot.com/exclusao-de-conta</a>.</p></section>

          <section><h2>11. Direitos do titular</h2><p>Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade quando aplicável, informação sobre compartilhamentos, revogação do consentimento e revisão de decisões automatizadas. Algumas solicitações exigem validação de identidade para proteger a conta.</p></section>

          <section><h2>12. Crianças e adolescentes</h2><p>O SindCopilot é destinado a profissionais e organizações responsáveis por gestão condominial. Não é direcionado a crianças e não deve ser usado para criar contas por menores sem representação legal adequada.</p></section>

          <section><h2>13. Alterações</h2><p>Esta política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais. A versão e a data de vigência serão sempre exibidas nesta página.</p></section>

          <section><h2>14. Contato</h2><p>E-mail de privacidade e suporte: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p><p><a className="inline-flex items-center gap-1" href="/exclusao-de-conta">Solicitar exclusão de conta <ExternalLink className="h-4 w-4" /></a></p></section>
        </div>
      </article>
    </main>
  );
}
