import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Handshake } from "lucide-react";

export default function TermosParceiros() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" asChild><Link href="/parceiros"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Parceiros</Link></Button>
        <Card>
          <CardHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Handshake className="h-6 w-6" /></div>
            <CardTitle>Termos do Programa de Parceiros SindCopilot — versão 1.0</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-slate-700">
            <p>O Programa de Parceiros permite que criadores, consultores, empresas e profissionais indiquem o SindCopilot por meio de código ou link individual e recebam comissão sobre clientes elegíveis originados por essa indicação.</p>
            <p><strong>Comissão.</strong> A condição padrão de lançamento é de 30% sobre o valor efetivamente recebido pelo SindCopilot de cada cliente atribuído ao parceiro, por até 12 meses contados do primeiro pagamento confirmado. A comissão só é gerada após confirmação do pagamento pelo provedor de cobrança.</p>
            <p><strong>Atribuição.</strong> A indicação é vinculada ao primeiro código de parceiro validamente associado à conta do cliente. Autoindicação, cadastros artificiais, fraude, spam, compra de tráfego enganosa ou tentativa de manipular a atribuição podem resultar em cancelamento das comissões e suspensão do parceiro.</p>
            <p><strong>Oferta Fundadores 100.</strong> Enquanto a campanha estiver ativa, os primeiros 100 clientes elegíveis do plano Starter originados por parceiros podem contratar por R$ 49,90 por mês durante 12 meses, em vez do preço regular de R$ 79,90 por mês. A condição é pessoal, intransferível e se encerra ao fim das 12 cobranças promocionais ou em caso de cancelamento.</p>
            <p><strong>Elegibilidade e pagamento.</strong> As comissões ficam em análise por pelo menos 14 dias antes de serem consideradas elegíveis. Valores referentes a pagamentos cancelados, devolvidos, fraudulentos ou inválidos podem ser estornados. O parceiro deve manter uma chave Pix válida cadastrada para recebimento.</p>
            <p><strong>Comunicação.</strong> O parceiro não pode se apresentar como funcionário, representante legal ou agente com poderes para assumir obrigações em nome do SindCopilot. Materiais publicitários devem ser verdadeiros e não podem prometer resultados, economias ou funcionalidades inexistentes.</p>
            <p><strong>Privacidade.</strong> O painel do parceiro apresenta métricas comerciais sem expor CPF, e-mail, telefone ou outros dados pessoais dos clientes indicados.</p>
            <p><strong>Alterações e encerramento.</strong> O SindCopilot pode atualizar condições do programa mediante comunicação no painel ou por e-mail. Comissões já elegíveis e válidas permanecem registradas. O programa pode ser encerrado ou a conta pausada em caso de violação destes termos.</p>
            <p>Ao solicitar habilitação no programa, o parceiro declara que leu e aceitou estes termos.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
