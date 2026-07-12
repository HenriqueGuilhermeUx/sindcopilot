# SindCopilot — versão independente

SaaS para síndicos profissionais administrarem vários condomínios em uma única operação. Esta versão não depende do Manus: autenticação, banco, arquivos, IA e cobrança são controlados pela própria aplicação.

## Arquitetura

- **Frontend:** React 19, Vite, Tailwind CSS e tRPC.
- **Backend:** Node.js, Express e tRPC.
- **Auth, banco e arquivos:** Supabase.
- **IA:** OpenAI Responses API e Embeddings API.
- **Cobrança:** assinaturas Pix recorrentes pela Woovi.
- **Hospedagem:** Render Web Service + Render Cron Job.

## Recursos

- Teste gratuito de 7 dias.
- Dashboard multi-condomínio.
- Condomínios, unidades, moradores e proprietários.
- Documentos privados no Supabase Storage.
- OCR de notas fiscais, recibos, boletos e ordens de serviço.
- Indexação de convenções, regimentos, atas, contratos e laudos.
- Busca semântica com referências por documento e página.
- Assistente de convenções e regimentos.
- Geração de minutas para revisão humana.
- Agenda de compliance com recorrência e rotina diária.
- CRM privado de fornecedores.
- Ajudantes com acesso de edição ou somente leitura.
- Relatórios em PDF.
- Planos Starter e Pro cobrados por Pix via Woovi.
- Limites mensais de IA, OCR, minutas e armazenamento.

## 1. Instalação local

Requisitos: Node.js 20+, projeto Supabase, chave OpenAI e AppID de API da Woovi.

```bash
npm install --include=dev
cp .env.example .env
npm run dev
```

## 2. Supabase

No **SQL Editor**, execute nesta ordem:

```text
supabase/migrations/0001_initial.sql
supabase/migrations/0002_replace_stripe_with_woovi.sql
```

A segunda migration é idempotente e também atualiza instalações que tenham usado a versão anterior.

Em **Authentication → URL Configuration**:

```text
Site URL: https://SEU-DOMINIO
Redirect URLs:
https://SEU-DOMINIO/dashboard
https://SEU-DOMINIO/convite/**
http://localhost:5173/dashboard
http://localhost:5173/convite/**
```

Variáveis:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_STORAGE_BUCKET=documents
```

A `service role` deve existir somente no servidor.

## 3. OpenAI

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## 4. Woovi

Na Woovi, crie uma integração do tipo **API** e copie o AppID.

```env
WOOVI_API_URL=https://api.woovi.com
WOOVI_APP_ID=SEU_APP_ID
WOOVI_WEBHOOK_AUTH_TOKEN=UM_SEGREDO_FORTE_OPCIONAL
```

A aplicação cria assinaturas mensais em `/api/v1/subscriptions`, usando o valor do plano e os dados do perfil. Nome, CPF e telefone precisam estar preenchidos.

Configure o webhook:

```text
URL: https://SEU-DOMINIO/api/woovi/webhook
Eventos: OPENPIX:CHARGE_COMPLETED e OPENPIX:CHARGE_EXPIRED
Método: POST
```

A aplicação valida `x-webhook-signature`. Caso defina `WOOVI_WEBHOOK_AUTH_TOKEN`, configure o mesmo valor no header `Authorization` do webhook.

O plano só é ativado depois da confirmação de pagamento e da validação do valor recebido.

## 5. Render

O `render.yaml` cria o Web Service e o Cron Job de compliance.

O build usa:

```text
npm install --include=dev && npm run build
```

Isso instala Vite, TypeScript e tsup mesmo com `NODE_ENV=production`.

Variáveis principais do Web Service:

```env
APP_URL=https://SEU-DOMINIO
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
WOOVI_APP_ID=...
WOOVI_API_URL=https://api.woovi.com
WOOVI_WEBHOOK_AUTH_TOKEN=...
```

## 6. E-mail

Resend é opcional:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=SindCopilot <noreply@seudominio.com>
CONTACT_EMAIL=contato@seudominio.com
```

## 7. Validação

```bash
npm run typecheck
npm test
npm run build
```

## 8. Segurança

- Isolamento de dados por titular e condomínio.
- Perfil `viewer` sem escrita.
- Bucket privado e URLs temporárias.
- Webhook Woovi validado por assinatura.
- Eventos processados com idempotência.
- Valor da cobrança comparado com o plano antes da ativação.
- Limites de uso de IA e armazenamento por plano.

Leia também `SECURITY.md`.

## 9. Aviso

O assistente não substitui advogado, administradora, contador, engenheiro ou empresa técnica. Toda notificação, advertência ou multa é uma **minuta para revisão humana**.
