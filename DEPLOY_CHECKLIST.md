# Checklist de publicação — SindCopilot

## GitHub e Render

- [ ] Branch `main` selecionada.
- [ ] Build command: `npm install --include=dev && npm run build`.
- [ ] Start command: `npm start`.
- [ ] Health check: `/api/health`.
- [ ] Node 22 configurado.

## Supabase

- [ ] Projeto criado.
- [ ] `0001_initial.sql` executada.
- [ ] `0002_replace_stripe_with_woovi.sql` executada.
- [ ] URLs de autenticação configuradas.
- [ ] `SUPABASE_URL` configurada.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada somente no servidor.
- [ ] `VITE_SUPABASE_URL` configurada no build.
- [ ] `VITE_SUPABASE_ANON_KEY` configurada no build.

## OpenAI

- [ ] `OPENAI_API_KEY` configurada.
- [ ] OCR testado com imagem e PDF.
- [ ] Convenção indexada e consultada com indicação da página.

## Woovi

- [ ] Integração do tipo API criada.
- [ ] `WOOVI_APP_ID` configurado.
- [ ] `WOOVI_API_URL=https://api.woovi.com`.
- [ ] Webhook criado para `/api/woovi/webhook`.
- [ ] Evento `OPENPIX:CHARGE_COMPLETED` habilitado.
- [ ] Evento `OPENPIX:CHARGE_EXPIRED` habilitado.
- [ ] `WOOVI_WEBHOOK_AUTH_TOKEN` configurado no Render e no header Authorization do webhook, caso utilizado.
- [ ] Starter e Pro testados por Pix.
- [ ] Pagamento confirmado ativa o plano correto.
- [ ] Cobrança expirada testada.

## E-mail e cron

- [ ] Resend configurado ou convites manuais testados.
- [ ] Cron com acesso ao mesmo Supabase.
- [ ] Rotina de compliance executada manualmente uma vez.

## Produto

- [ ] Cadastro e confirmação de email testados.
- [ ] Termos e LGPD registrados.
- [ ] Perfil com nome, CPF e telefone.
- [ ] Um segundo usuário não acessa os dados do primeiro.
- [ ] Ajudante aceita convite.
- [ ] Viewer não consegue alterar registros.
- [ ] Upload, OCR e exclusão de documento testados.
- [ ] Assistente responde com fonte e página.
- [ ] PDF exportado corretamente.

## Antes de anunciar

- [ ] Revisar Termos e Política com profissional jurídico.
- [ ] Criar rotina de backup e recuperação.
- [ ] Criar monitoramento de erros e disponibilidade.
- [ ] Realizar beta com 3 a 5 síndicos.
