# Implementação independente concluída

## Substituições realizadas

| Componente antigo | Componente independente |
|---|---|
| OAuth/SDK Manus | Supabase Auth |
| Forge Storage | Supabase Storage privado |
| Forge/Manus LLM | OpenAI API direta |
| MySQL sem isolamento integral | Supabase Postgres com relacionamentos, índices e validação no backend |
| Documentos por URL pública | Chaves privadas e URLs temporárias |
| Texto jurídico parcial | Extração por página, chunks, embeddings e recuperação semântica |
| Stripe com estados básicos | Webhooks idempotentes e estados de assinatura |
| Alertas apenas visuais | Cron diário e registro de entrega |
| Convite cadastrado sem fluxo | Link de convite, aceitação e papéis assistant/viewer |

## Bloqueadores corrigidos

- Acesso entre contas por IDs previsíveis.
- Alterações e exclusões sem conferir o proprietário.
- Dependência operacional do Manus.
- Falta da migration inicial completa.
- Upload sem validação de tipo e tamanho.
- Falta de limites de custo para IA.
- PDFs enviados incorretamente como imagem.
- Citações jurídicas sem recuperação por página.
- Mensagem duplicada no histórico do chat.
- Webhook Stripe sem idempotência persistente.
- Origem do Checkout fornecida pelo navegador.

## Estado técnico

- Build de produção concluído.
- Typecheck concluído.
- Oito testes automatizados concluídos.
- Auditoria npm sem vulnerabilidades conhecidas.
- Pacote pronto para receber credenciais e ser implantado.

## O que ainda depende do proprietário

A aplicação não pode ser publicada de verdade sem contas e segredos externos. É necessário criar ou informar:

- projeto Supabase;
- chave OpenAI;
- conta Stripe;
- serviço Render;
- domínio;
- provedor de email opcional.

Nenhuma credencial real está incluída neste pacote.
