# Segurança dos dados — respostas de referência para a Google Play

Versão analisada: **SindCopilot Android 1.1.1**  
Pacote: **com.sindcopilot.app**

As respostas enviadas na Play Console devem permanecer alinhadas às integrações realmente habilitadas em produção.

## Coleta, compartilhamento e venda

- O aplicativo coleta dados necessários para criar a conta e entregar as funcionalidades solicitadas.
- O SindCopilot não vende dados pessoais.
- Não há SDK de anúncios nem uso para publicidade comportamental.
- Prestadores de serviço podem processar dados como operadores para autenticação, armazenamento, hospedagem, inteligência artificial, pagamento e e-mail.

## Tipos de dados coletados

### Informações pessoais

- Nome
- E-mail
- Telefone, quando informado
- CPF, quando informado
- Empresa e registro profissional, quando informados
- Identificador da conta e função de acesso

Finalidades: gerenciamento da conta, autenticação, perfil profissional, suporte, segurança e controle de acesso.

### Informações financeiras e de compra

- Plano contratado
- Identificador e status da assinatura
- Confirmação de cobrança Pix e período de acesso
- Dados necessários à cobrança processada pela Woovi

Finalidades: cobrança, confirmação de pagamento, administração da assinatura, prevenção a fraude e suporte. O aplicativo não armazena dados de cartão de crédito.

### Fotos, arquivos e conteúdo fornecido pelo usuário

- Documentos, fotos e arquivos enviados
- Condomínios, unidades e contatos cadastrados pelo usuário
- Checklists, visitas, ocorrências, pendências, prazos e obrigações
- Fornecedores e contatos
- Perguntas e mensagens enviadas ao assistente de IA

Finalidades: executar as funções escolhidas pelo usuário, organizar a operação, gerar relatórios e manter o histórico da conta.

### Atividade no app e diagnóstico

- Ações administrativas e eventos de segurança
- Estado de processamento de documentos
- Consumo de funcionalidades e limites do plano
- Endereço IP, data, horário, dispositivo, navegador, sistema e registros de erro necessários ao funcionamento e à segurança

Finalidades: operação, auditoria, prevenção a abuso, suporte e correção de falhas.

## Processadores utilizados

- Supabase: autenticação, banco de dados e armazenamento privado
- Render: hospedagem do serviço
- OpenAI: funções de IA e embeddings quando solicitadas
- Woovi: assinatura e cobrança Pix
- Resend e provedores de e-mail: comunicações transacionais quando habilitadas

## Segurança

- Dados transmitidos por HTTPS
- Autenticação por sessão
- Isolamento por conta, função e condomínio
- Arquivos em armazenamento privado, acessados por URLs temporárias
- Segredos administrativos mantidos no servidor
- Limites de requisição e registros de auditoria

## Exclusão de conta

Caminho dentro do aplicativo:

`Meu Perfil → Excluir conta`

Recurso externo, acessível sem instalar o app:

`https://sindcopilot.com/exclusao-de-conta`

A exclusão autenticada tenta cancelar a assinatura vinculada antes de excluir a conta. Depois remove o usuário, perfil, condomínios, documentos, arquivos privados, visitas, pendências, fornecedores, mensagens e registros operacionais associados, observadas as relações do banco de dados.

Registros mínimos de cobrança, segurança, auditoria, prevenção a fraude ou obrigações legais podem ser conservados pelo prazo necessário. Backups e logs podem permanecer temporariamente até o ciclo técnico de sobrescrita do provedor.

## Permissões Android

- Internet: autenticação, sincronização e acesso ao serviço
- Estado da rede: funcionamento offline/online
- Câmera: captura opcional de documentos, vistorias e ocorrências
- Notificações: alertas opcionais
- Vibração: retorno tátil do aplicativo

O aplicativo não solicita localização em segundo plano, contatos, SMS ou histórico de chamadas.

## URLs obrigatórias

- Política de Privacidade: `https://sindcopilot.com/privacidade`
- Exclusão de conta: `https://sindcopilot.com/exclusao-de-conta`
- Termos de Uso: `https://sindcopilot.com/termos`
