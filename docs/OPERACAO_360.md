# SindCopilot — Operação 360 Multi-Condomínio

## Estado preservado
- Site e app Android já publicados/distribuídos.
- Não alterar release Android/AAB nesta frente.
- Financeiro Inteligente multi-condomínio já existente, com importação CSV/XLSX/OFX/PDF, conciliação, fechamento e balancete PDF.
- Modo Visita, Ocorrências, Documentos/OCR, RAG jurídico, Compliance, Notificações, Fornecedores e Assistente IA já existentes.
- Toda informação operacional deve permanecer isolada por titular, condomínio e, quando aplicável, unidade.

## Objetivo
Transformar os módulos existentes em um centro de comando único para o síndico profissional que administra vários condomínios simultaneamente.

## Complementos priorizados

### 1. Carteira 360 / Farol multi-condomínio
- Visão consolidada de todos os condomínios.
- Urgências por condomínio: ocorrências, obrigações vencidas/próximas, documentos pendentes e fechamento financeiro.
- Saúde operacional por condomínio: verde/amarelo/vermelho.
- Troca rápida de contexto sem misturar dados.
- Relatório consolidado exportável em PDF.

### 2. Unidade 360
- Página única por unidade.
- Morador/proprietário e contatos atuais.
- Linha do tempo: ocorrências, advertências, notificações, multas e atividades.
- Histórico de anexos/fotos ligados à unidade.
- Ações rápidas: registrar ocorrência, gerar minuta, abrir WhatsApp, enviar e-mail.
- Exportação da ficha/histórico em PDF.

### 3. Central de Comunicação
- Comunicados por condomínio e, futuramente, carteira inteira.
- Seleção de público: todos, unidades selecionadas ou destinatário individual.
- Canais: e-mail, WhatsApp por link/webhook configurável e push quando disponível.
- Registro de envio, status e conteúdo para auditoria.
- Nunca enviar multa/advertência automaticamente sem revisão humana.

### 4. Documentos e Histórico Visual
- OCR já existente como base.
- Vincular fotos/documentos a unidade, área comum, ocorrência, visita ou fornecedor.
- Galeria por condomínio com filtros por tipo, período e vínculo.
- Evidência original preservada.

### 5. Compliance operacional
- Além do vencimento: responsável, fornecedor, status de contratação, evidência e conclusão.
- Rotinas recorrentes de AVCB, seguro, para-raios, dedetização, caixa d'água, elevadores e laudos.
- Farol global + alertas antecipados.

### 6. Fornecedores 360
- Histórico de serviços por condomínio.
- Avaliação, documentos, contatos, ocorrências relacionadas e vencimentos contratuais.
- Comparação de desempenho sem compartilhar dados entre contas.

### 7. Financeiro — próximos complementos
- Preservar o Financeiro Inteligente atual.
- Aprovação operacional de despesas vinculando lançamento + nota/recibo + fornecedor.
- Fluxo de revisão/aprovação, sem movimentar dinheiro automaticamente.
- Relatórios por condomínio e consolidado de carteira em PDF.

### 8. Assistente contextual
- Manter RAG restrito ao condomínio selecionado.
- Responder também sobre pendências operacionais da própria conta, sem misturar condomínios.
- Atalhos: resumir ata, regra de mudança, pendências da semana, ocorrências críticas, vencimentos e situação financeira.
- Respostas jurídicas sempre como apoio/minuta, com revisão humana.

## Sequência de implementação
1. Carteira 360 + PDF consolidado.
2. Unidade 360 + timeline + PDF.
3. Central de Comunicação auditável.
4. Documentos/Histórico Visual contextual.
5. Compliance com workflow operacional.
6. Fornecedores 360.
7. Aprovação de despesas.
8. Assistente operacional contextual.

## Regras de segurança
- Multi-tenancy obrigatório em toda consulta/escrita.
- Ajudante viewer continua sem escrita.
- Nenhuma automação financeira movimenta recursos.
- Nenhuma penalidade é enviada automaticamente.
- Evidências e documentos permanecem privados.
- Dados de um condomínio nunca aparecem no contexto de outro.
