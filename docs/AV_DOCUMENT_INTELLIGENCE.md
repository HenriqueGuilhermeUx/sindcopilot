# SindCopilot × AV Document Intelligence

O SindCopilot usa o AV Document Intelligence como camada compartilhada de normalização documental da Alternative Ventures.

## Fluxo

1. O arquivo permanece no storage privado do SindCopilot.
2. O SindCopilot extrai texto/páginas usando o pipeline já existente.
3. Apenas o texto necessário é enviado server-to-server ao endpoint da Alternative Ventures.
4. O AV Document Intelligence devolve classificação, confiança, partes, datas, valores, identificadores, itens e obrigações.
5. Financeiros continuam com fallback para o extrator local já existente se a extração compartilhada não retornar campos centrais.
6. Documentos legais continuam sendo indexados normalmente para RAG/busca semântica mesmo se o serviço compartilhado estiver indisponível.

## Tipos mapeados

- nota_fiscal → fiscal_document
- recibo → receipt
- ordem_servico → purchase_order
- boleto → invoice
- ata → meeting_minutes
- convencao/regimento/laudo → legal_document
- contrato → contract

## Ambiente

- `AV_DOCUMENT_INTELLIGENCE_ENABLED`
- `AV_DOCUMENT_INTELLIGENCE_URL`
- `AV_DOCUMENT_INTELLIGENCE_KEY`

A chave é somente server-side e nunca deve ser exposta ao frontend.

## Segurança

O AV OS recebe apenas métricas operacionais agregadas. Conteúdo documental não deve ser copiado para o dashboard da holding.
