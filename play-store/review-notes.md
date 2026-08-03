# Notas para a análise da Google Play

## Resumo do aplicativo

O SindCopilot é uma ferramenta de produtividade e gestão para síndicos profissionais. A versão Android permite consultar prioridades, realizar vistorias, registrar ocorrências, acompanhar obrigações, acessar documentos e utilizar o assistente com base em documentos cadastrados.

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
9. Abrir **Mais → Assistente IA** e fazer uma pergunta sobre o documento de demonstração.
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
