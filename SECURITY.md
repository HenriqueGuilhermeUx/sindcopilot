# Segurança do SindCopilot

## Segredos

Nunca envie para o GitHub:

- `.env`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENAI_API_KEY`;
- `WOOVI_APP_ID`;
- `WOOVI_WEBHOOK_AUTH_TOKEN`;
- `RESEND_API_KEY`;
- `CRON_SECRET`.

Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são públicas no navegador.

## Isolamento de contas

O frontend envia o JWT ao backend, que valida o usuário, resolve o titular, verifica a função, valida o condomínio permitido e inclui o identificador do titular em consultas e alterações.

## Arquivos

- Bucket privado.
- URL assinada com expiração curta.
- Limite de 20 MB por arquivo.
- Somente PDF, JPEG, PNG e WebP.
- Nome normalizado.
- Remoção no Storage quando o registro é apagado.

## Inteligência artificial

- Documentos são tratados como conteúdo não confiável.
- O modelo recebe ordem para ignorar instruções encontradas nos arquivos.
- Citações só são exibidas quando vierem dos trechos recuperados.
- Multas e advertências são minutas para aprovação humana.
- Chaves e tokens nunca são enviados ao modelo.

## Woovi

- O webhook recebe o corpo bruto.
- `x-webhook-signature` é validado antes do processamento.
- Um token adicional de autorização pode ser exigido.
- O ID do evento é salvo para idempotência.
- O valor pago é comparado com o valor do plano antes da ativação.
- O cliente é associado à conta pelo `correlationID`.

## Operação

- Habilite MFA em Supabase, Render, GitHub, OpenAI e Woovi.
- Restrinja o acesso aos segredos.
- Ative alertas de custo.
- Não registre nos logs o conteúdo integral dos documentos.
- Mantenha dependências atualizadas.
- Teste restauração de backup.
- Adicione monitoramento de erros antes da divulgação ampla.

Vulnerabilidades devem ser comunicadas de forma privada ao e-mail configurado em `CONTACT_EMAIL`.
