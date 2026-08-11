# Notas para a análise da Google Play

## Resumo do aplicativo

O SindCopilot é uma ferramenta de produtividade e gestão para síndicos profissionais. A versão Android permite consultar prioridades, realizar vistorias, registrar ocorrências, acompanhar obrigações, acessar documentos e utilizar o assistente com base em documentos cadastrados.

## Correção da versão 1.1.2

Esta versão corrige especificamente o problema de funcionalidade reportado na revisão anterior.

- O **Assistente IA** passou a utilizar uma rota dedicada e autenticada no backend.
- Consultas possuem timeout e nova tentativa automática para falhas transitórias do provedor.
- As perguntas sugeridas respondem ao toque, sem depender de um segundo comando.
- Se o serviço externo de IA estiver temporariamente indisponível, o aplicativo oferece uma resposta operacional de contingência e um botão **Tentar novamente**, em vez de exibir uma área sem resposta.
- Ícones de avatar do chat são apenas decorativos e não possuem aparência/comportamento de botão.
- Botões de limpar conversa e enviar pergunta possuem rótulos acessíveis e estado visual de carregamento.
- Atalhos da navegação móvel foram revisados para não prometer ações que a tela de destino não executa automaticamente.

Teste rápido sugerido: abra **Mais → Assistente IA** e toque em **“Como aplicar uma multa por infração?”**. A pergunta é enviada imediatamente e deve produzir uma resposta no próprio chat.

## Acesso para análise

Antes de enviar a versão para produção, preencher na Play Console uma conta de demonstração reutilizável:

- E-mail: `PREENCHER_NA_PLAY_CONSOLE`
- Senha: `PREENCHER_NA_PLAY_CONSOLE`

A conta deve permanecer ativa durante toda a análise e conter:

- Pelo menos um condomínio de demonstração
- Uma visita anterior
- Uma obrigação próxima do vencimento
- Um fornecedor
- Um documento de demonstração sem dados pessoais reais
- Preferencialmente uma Convenção ou Regimento de demonstração já indexado para testar respostas contextualizadas

Não coloque credenciais reais neste arquivo ou no repositório.

## Roteiro sugerido para o revisor

1. Entrar com a conta de demonstração.
2. Abrir **Hoje** para visualizar as prioridades.
3. Abrir **Visitas** e iniciar uma vistoria no condomínio de demonstração.
4. Marcar um item como Conforme e outro como Atenção.
5. Adicionar uma observação. O uso da câmera é opcional.
6. Salvar ou concluir a visita.
7. Abrir **Pendências** para consultar obrigações.
8. Abrir **Mais → Documentos** para visualizar os arquivos cadastrados.
9. Abrir **Mais → Assistente IA** e tocar em uma pergunta sugerida ou digitar uma pergunta. Para uma regra interna específica, selecione o condomínio que possui documento indexado.
10. Abrir **Mais → Meu perfil** para encontrar a opção de exclusão de conta.

## Cobrança

O aplicativo Android não exibe checkout externo nem direciona o usuário para pagamento fora da Google Play. Ele mostra apenas o plano e os direitos já associados à conta. A contratação e a gestão comercial continuam separadas do fluxo do aplicativo publicado.

## Permissões

- Câmera: solicitada somente quando o usuário decide fotografar uma ocorrência ou documento.
- Notificações: opcional e utilizada para alertas do produto quando habilitados.
- Internet: necessária para autenticação e sincronização.

O aplicativo continua permitindo preencher o checklist e manter o rascunho da visita quando a conexão fica indisponível.

## Exclusão de conta

Dentro do app:

`Mais → Meu perfil → Excluir conta`

Página pública:

`https://sindcopilot.com/exclusao-de-conta`
