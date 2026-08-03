# Segurança dos dados — base para o formulário da Google Play

Este documento descreve o comportamento da versão Android do SindCopilot. As respostas finais na Play Console devem permanecer alinhadas ao código e às integrações efetivamente habilitadas em produção.

## Compartilhamento e venda

- O SindCopilot não vende dados pessoais.
- Dados não são compartilhados para publicidade comportamental.
- Prestadores de infraestrutura podem processar dados exclusivamente para autenticação, armazenamento, hospedagem, inteligência artificial, e-mail e funcionamento do serviço.

## Dados coletados

### Informações pessoais

- Nome
- E-mail
- Telefone, quando informado
- CPF, quando informado
- Empresa e registro profissional, quando informados

Finalidades: criação e manutenção da conta, autenticação, perfil profissional, suporte e controle de acesso.

### Conteúdo fornecido pelo usuário

- Condomínios e unidades cadastrados
- Documentos, fotos e arquivos enviados
- Checklists, visitas e ocorrências
- Pendências, prazos e obrigações
- Fornecedores e contatos cadastrados
- Perguntas e mensagens enviadas ao assistente

Finalidades: executar as funcionalidades solicitadas, organizar a operação e manter o histórico do usuário.

### Atividade no aplicativo

- Ações administrativas registradas no histórico da conta
- Estado de processamento de documentos
- Uso de funcionalidades sujeito aos limites do plano

Finalidades: segurança, auditoria da operação, suporte e funcionamento do produto.

### Diagnóstico técnico

Logs de erro e dados técnicos mínimos podem ser processados pela infraestrutura de hospedagem para segurança e correção de falhas. O aplicativo não inclui SDK próprio de publicidade ou rastreamento comportamental.

## Segurança

- Dados são transmitidos por HTTPS.
- A autenticação utiliza Supabase Auth.
- Arquivos ficam em armazenamento privado e são acessados por URLs temporárias assinadas.
- O backend aplica isolamento por proprietário, ajudante e condomínio.
- O aplicativo não inclui chaves administrativas do Supabase ou segredos do servidor.

## Exclusão de dados

A exclusão pode ser iniciada dentro do aplicativo em:

`Meu perfil → Excluir conta`

Também há uma página pública:

`https://sindcopilot.com/exclusao-de-conta`

A exclusão autenticada remove o usuário. Para contas proprietárias, os registros relacionados são removidos pelas relações do banco e os arquivos privados são excluídos do armazenamento.

## Retenção

- Dados permanecem enquanto a conta estiver ativa e forem necessários para a prestação do serviço.
- Após solicitação de exclusão, dados vinculados à conta são removidos, exceto informações cuja retenção seja exigida por obrigação legal ou necessária à defesa de direitos.
- Backups da infraestrutura podem seguir o ciclo técnico do provedor antes da eliminação definitiva.

## Permissões Android

- Internet: sincronização e acesso ao serviço.
- Câmera: registro opcional de fotos e documentos.
- Notificações: alertas opcionais quando essa funcionalidade estiver habilitada.

O aplicativo não solicita localização em segundo plano, contatos, SMS ou registro de chamadas.
