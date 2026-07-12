# Segurança do SindCopilot

## Segredos

Nunca envie para o GitHub:

- `.env`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENAI_API_KEY`;
- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `RESEND_API_KEY`;
- `CRON_SECRET`.

Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são públicas no navegador.

## Isolamento de contas

O frontend não acessa as tabelas de operação diretamente. Ele envia o JWT ao backend, que:

1. valida o usuário no Supabase Auth;
2. resolve o titular da conta;
3. verifica a função do usuário;
4. valida o condomínio permitido;
5. inclui o identificador do titular nas consultas e alterações.

Não remova essas verificações ao criar novas rotas.

## Arquivos

- Bucket privado.
- URL assinada com expiração curta.
- Limite de 20 MB por arquivo.
- Somente PDF, JPEG, PNG e WebP.
- Nome do arquivo normalizado.
- Remoção no Storage quando o registro é apagado.

Não transforme o bucket em público.

## Inteligência artificial

- Documentos podem conter instruções maliciosas.
- O modelo recebe ordem explícita para ignorar instruções encontradas nos arquivos.
- Citações só devem ser exibidas quando vierem dos trechos recuperados.
- Multas e advertências são minutas para aprovação humana.
- Não envie chaves, tokens ou dados desnecessários ao modelo.

## Stripe

- A rota de webhook recebe corpo bruto.
- A assinatura é verificada antes de processar.
- O ID do evento é salvo para idempotência.
- URLs de retorno vêm de `APP_URL`, não de parâmetros do navegador.

## Operação

Recomendações para produção:

- habilitar MFA nas contas Supabase, Render, GitHub, OpenAI e Stripe;
- restringir membros com acesso a segredos;
- ativar alertas de custo;
- revisar logs sem registrar conteúdo integral de documentos;
- manter dependências atualizadas;
- testar restauração de backup;
- adicionar monitoramento de erros antes da divulgação ampla.

## Reporte

Vulnerabilidades devem ser comunicadas de forma privada ao e-mail configurado em `CONTACT_EMAIL`.
