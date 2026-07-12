# Checklist de publicação — SindCopilot

## Supabase

- [ ] Projeto criado.
- [ ] `supabase/migrations/0001_initial.sql` executado sem erros.
- [ ] Tabelas e bucket `documents` criados.
- [ ] Email provider habilitado.
- [ ] Site URL configurada.
- [ ] Redirect URL `/dashboard` configurada.
- [ ] Redirect URL `/convite/**` configurada.
- [ ] SMTP próprio configurado para produção.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` mantida apenas no backend.

## OpenAI

- [ ] `OPENAI_API_KEY` configurada.
- [ ] Limite financeiro da conta configurado.
- [ ] OCR testado com imagem.
- [ ] OCR testado com PDF digital.
- [ ] Fallback testado com PDF escaneado.
- [ ] Convenção indexada e consultada com indicação da página.

## Stripe

- [ ] Chave secreta de teste configurada.
- [ ] Webhook criado.
- [ ] Eventos de assinatura selecionados.
- [ ] `STRIPE_WEBHOOK_SECRET` configurado.
- [ ] Checkout Starter testado.
- [ ] Checkout Pro testado.
- [ ] Billing Portal testado.
- [ ] Cancelamento testado.
- [ ] Falha de pagamento testada.
- [ ] Depois dos testes, chaves Live configuradas.

## Render

- [ ] Repositório GitHub conectado.
- [ ] Blueprint `render.yaml` criado.
- [ ] `APP_URL` preenchida com HTTPS.
- [ ] Variáveis Supabase do frontend presentes durante o build.
- [ ] Variáveis Supabase do backend presentes.
- [ ] `CRON_SECRET` gerado.
- [ ] Web Service saudável em `/api/health`.
- [ ] Cron diário executado manualmente uma vez.
- [ ] Domínio próprio apontado.

## E-mail

- [ ] Domínio remetente validado.
- [ ] `RESEND_API_KEY` configurada.
- [ ] `EMAIL_FROM` configurado.
- [ ] Convite recebido em Gmail e Outlook.
- [ ] Alerta de compliance recebido.

## Produto

- [ ] Cadastro e confirmação de email testados.
- [ ] Termos e LGPD registrados.
- [ ] Um segundo usuário não acessa os dados do primeiro.
- [ ] Ajudante aceita convite.
- [ ] Viewer não consegue alterar registros.
- [ ] Arquivo privado não abre sem URL assinada.
- [ ] Exclusão do documento remove o arquivo.
- [ ] Limites Free e Trial testados.
- [ ] PDF exportado corretamente.
- [ ] Landing revisada no celular.

## Antes de anunciar

- [ ] Criar conta de suporte com domínio oficial.
- [ ] Revisar Termos e Política com profissional jurídico.
- [ ] Criar rotina de backup e recuperação.
- [ ] Criar monitoramento de erros e disponibilidade.
- [ ] Realizar beta com 3 a 5 síndicos.
