# Implementação independente concluída

## Serviços atuais

| Função | Serviço |
|---|---|
| Autenticação | Supabase Auth |
| Banco | Supabase PostgreSQL |
| Arquivos | Supabase Storage privado |
| OCR e assistente | OpenAI |
| Assinatura e Pix | Woovi |
| E-mail | Resend, opcional |
| Hospedagem | Render |

## Cobrança

- Planos Starter e Pro criam assinaturas pela API Woovi.
- O cliente é identificado pelo `correlationID` igual ao UUID da conta.
- A ativação ocorre somente após `OPENPIX:CHARGE_COMPLETED`.
- O valor recebido é validado contra o valor do plano.
- Eventos são idempotentes na tabela `woovi_events`.
- Cobrança expirada pode marcar a conta como inadimplente após o fim do período já pago.

## Bloqueadores corrigidos

- Acesso entre contas por IDs previsíveis.
- Alterações e exclusões sem conferir o proprietário.
- Dependência operacional do Manus.
- Upload sem validação de tipo e tamanho.
- Falta de limites de custo para IA.
- PDFs enviados incorretamente como imagem.
- Citações jurídicas sem recuperação por página.
- Build do Render sem Vite/tsup.

## Build do Render

```text
npm install --include=dev && npm run build
```

A opção `--include=dev` garante a instalação das ferramentas de build mesmo com `NODE_ENV=production`.

## Estado técnico

- TypeScript aprovado.
- 11 testes automatizados aprovados.
- Build de produção aprovado.
- Integrações externas aguardam as credenciais do proprietário.
