# SindCopilot — versão independente

SaaS para síndicos profissionais administrarem vários condomínios em uma única operação. Esta versão não depende do Manus: autenticação, banco, arquivos, IA e cobrança usam serviços controlados pela própria aplicação.

## O que está incluído

- Landing page, cadastro, login por senha e link mágico.
- Teste gratuito de 7 dias sem cartão.
- Dashboard multi-condomínio.
- Condomínios, unidades, moradores e proprietários.
- Documentos privados em Supabase Storage.
- OCR de notas fiscais, recibos, boletos e ordens de serviço.
- Indexação de convenções, regimentos, atas, contratos e laudos.
- Busca semântica com `pgvector` e referências por documento/página.
- Assistente de convenções e regimentos.
- Geração de minutas para revisão humana.
- Agenda de compliance com recorrência e rotina diária.
- CRM privado de fornecedores.
- Ajudantes com convite, acesso de edição ou somente leitura.
- Relatórios em PDF.
- Stripe para assinaturas Starter e Pro.
- Limites mensais de IA, OCR, minutas, armazenamento e número de condomínios.
- Isolamento de dados por titular e permissões por condomínio.

## Arquitetura

- **Frontend:** React 19, Vite, Tailwind CSS e tRPC.
- **Backend:** Node.js 20+, Express 5 e tRPC.
- **Auth, banco e arquivos:** Supabase.
- **IA:** OpenAI Responses API e Embeddings API.
- **Cobrança:** Stripe Checkout, Billing Portal e webhooks.
- **Hospedagem recomendada:** Render Web Service + Render Cron Job.

## 1. Rodar localmente

### Requisitos

- Node.js 20 ou superior.
- Um projeto Supabase.
- Uma chave da OpenAI para OCR e assistente.
- Uma conta Stripe para testar assinaturas.

### Instalação

```bash
npm install
cp .env.example .env
```

Preencha o arquivo `.env` e depois execute:

```bash
npm run dev
```

Frontend e backend serão iniciados juntos. A URL local padrão é exibida pelo Vite.

## 2. Preparar o Supabase

1. Crie um novo projeto no Supabase.
2. Abra **SQL Editor**.
3. Copie e execute todo o arquivo:

```text
supabase/migrations/0001_initial.sql
```

A migration cria:

- tabelas e relacionamentos;
- índices e cascatas;
- extensão `pgvector`;
- funções atômicas de consumo e armazenamento;
- trigger de criação do perfil;
- bucket privado `documents`;
- políticas básicas de RLS.

### Configurar autenticação

No Supabase, abra **Authentication → URL Configuration** e configure:

```text
Site URL: https://SEU-DOMINIO
Redirect URLs:
https://SEU-DOMINIO/dashboard
https://SEU-DOMINIO/convite/**
http://localhost:5173/dashboard
http://localhost:5173/convite/**
```

Em **Authentication → Providers → Email**, deixe Email habilitado. Para produção, configure SMTP próprio para não depender do envio padrão do Supabase.

### Chaves necessárias

Em **Project Settings → API**, copie:

- Project URL → `SUPABASE_URL` e `VITE_SUPABASE_URL`;
- anon/public key → `VITE_SUPABASE_ANON_KEY`;
- service role key → `SUPABASE_SERVICE_ROLE_KEY`.

A chave `service role` deve existir apenas no servidor. Nunca coloque essa chave em uma variável `VITE_*`.

## 3. Configurar OpenAI

Crie uma chave e preencha:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

A aplicação envia imagens ou PDFs para extração estruturada, gera embeddings para os documentos jurídicos e recupera apenas os trechos relevantes antes de responder.

## 4. Configurar Stripe

Preencha:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

No Stripe, crie um webhook apontando para:

```text
https://SEU-DOMINIO/api/stripe/webhook
```

Assine estes eventos:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Os produtos e preços são criados dinamicamente no Checkout conforme os valores definidos em `src/shared/plans.ts`.

## 5. E-mail de convites e compliance

O envio por Resend é opcional. Sem Resend, o convite continua sendo criado e o link é copiado para o síndico compartilhar manualmente.

```env
RESEND_API_KEY=re_...
EMAIL_FROM=SindCopilot <noreply@seudominio.com>
CONTACT_EMAIL=contato@seudominio.com
```

Para entrega em produção, valide o domínio remetente no provedor de e-mail.

## 6. Deploy no Render

O arquivo `render.yaml` contém:

- um Web Service para frontend e backend;
- um Cron Job diário para compliance.

### Passos

1. Envie este projeto para um repositório GitHub.
2. No Render, selecione **New → Blueprint**.
3. Escolha o repositório.
4. Preencha todas as variáveis marcadas como `sync: false`.
5. No Web Service, defina também:

```env
APP_URL=https://SEU-DOMINIO
SUPABASE_STORAGE_BUCKET=documents
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
RESEND_API_KEY=...
EMAIL_FROM=...
CONTACT_EMAIL=...
```

6. Use o mesmo `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Cron Job.
7. Após o primeiro deploy, atualize as URLs permitidas no Supabase e o endpoint do Stripe.

**Importante:** as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam existir durante o build do frontend.

## 7. Comandos de qualidade

```bash
npm run typecheck
npm test
npm run build
npm audit
```

Estado validado deste pacote:

- TypeScript: aprovado.
- Testes: 11 aprovados.
- Build de produção: aprovado.
- Auditoria npm: 0 vulnerabilidades conhecidas.

## 8. Segurança aplicada

- Cada operação do backend valida o titular da conta.
- Unidades são verificadas por relacionamento com o condomínio.
- Ajudantes podem ser limitados a condomínios específicos.
- Perfil `viewer` não altera dados.
- Arquivos ficam em bucket privado e são abertos por URL temporária.
- Tipos de arquivo e tamanho máximo são validados.
- Webhooks Stripe são verificados e processados com idempotência.
- Uso de IA e armazenamento é controlado por plano.
- Textos encontrados em documentos são tratados como dados não confiáveis, não como instruções para a IA.

Leia também `SECURITY.md`.

## 9. Observações jurídicas e operacionais

O assistente não substitui advogado, administradora, contador, engenheiro ou empresa técnica. Toda notificação, advertência ou multa é salva como **minuta para revisão humana**. O usuário continua responsável pela correção dos documentos cadastrados, decisões tomadas e cumprimento das obrigações.

Antes de uma divulgação ampla, faça um beta com poucos síndicos e valide:

- qualidade do OCR em documentos reais;
- referências de páginas e cláusulas;
- entregabilidade dos e-mails;
- custo médio de IA por usuário;
- comportamento de renovação e cancelamento no Stripe.
