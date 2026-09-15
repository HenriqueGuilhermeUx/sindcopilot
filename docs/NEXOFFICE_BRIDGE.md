# SindCopilot ↔ NexOffice

O NexOffice entra no SindCopilot como camada operacional horizontal da administradora/síndico profissional. O SindCopilot continua dono do domínio condominial: condomínios, unidades, moradores, ocorrências, documentos condominiais, obrigações, compliance, visitas e inteligência especializada.

## Estado de rollout

O launcher fica **desligado por padrão**. A integração só aparece quando o ambiente web define explicitamente `VITE_NEXOFFICE_ENABLED=true`.

O servidor também precisa conhecer a URL do runtime NexOffice e a credencial interna server-to-server. A credencial interna é exclusivamente do backend e nunca deve ser exposta ao bundle web.

Variáveis usadas pelo bridge:

- `VITE_NEXOFFICE_ENABLED` — feature flag pública do launcher; manter `false` até validação controlada.
- `NEXOFFICE_BASE_URL` — URL da API NexOffice.
- `NEXOFFICE_INTERNAL_KEY` — credencial server-side do bridge; nunca usar prefixo `VITE_`.

## Modelo de tenant

O workspace NexOffice representa a **conta do SindCopilot**, não cada condomínio individual.

A chave federada é o `account_owner_id` da conta; para o titular, é o próprio `user.id`. Isso garante que um síndico profissional com vários condomínios continue operando em um único workspace horizontal.

### RBAC

Mapeamento inicial:

| SindCopilot | NexOffice |
| --- | --- |
| titular da conta | `owner` |
| `assistant` | `member` |
| `viewer` | `viewer` |
| role compartilhada desconhecida | `member` |

O bridge consulta `public.users.account_owner_id` e `account_role` no servidor. Role de autorização não é aceita do browser.

Se um assistente for a primeira pessoa a abrir o NexOffice, o backend provisiona **primeiro o titular real como owner** e só depois adiciona o assistente. Um membro delegado nunca consegue criar sozinho um workspace compartilhado sem proprietário.

## Dados enviados nesta fase

Somente o mínimo necessário para identidade e autorização operacional:

- ID do titular da conta como referência externa do workspace;
- ID do usuário atual como subject federado;
- nome/e-mail do titular e do membro quando necessário ao provisionamento;
- nome da empresa/conta para apresentação;
- role operacional;
- vertical `condo`;
- entitlement `addon.sindcopilot`.

### Dados que NÃO saem do SindCopilot

Nesta fase o bridge **não envia**:

- condomínios;
- unidades;
- moradores ou proprietários;
- CPF/CNPJ de moradores/fornecedores;
- ocorrências;
- evidências;
- atas, convenções, laudos ou outros arquivos;
- textos extraídos/OCR;
- obrigações de compliance;
- extratos, lançamentos ou saldos;
- dados de Pix/Woovi.

Qualquer sincronização de domínio futura deve nascer como adapter explícito, com escopo mínimo e revisão de privacidade separada.

## Fluxo SSO

1. Usuário autenticado no SindCopilot clica em NexOffice.
2. `POST /api/nexoffice/handoff` valida o access token usando Supabase Admin.
3. O backend resolve titular e role pela tabela `public.users`.
4. O titular é provisionado idempotentemente como owner.
5. Se for ajudante, o membro é provisionado no mesmo workspace com role mapeada.
6. O backend solicita ao NexOffice um handoff single-use de curta duração.
7. O browser navega para a URL temporária.
8. O NexOffice consome o código uma única vez e cria a própria sessão.

O token Supabase não é transformado em sessão NexOffice e a credencial interna nunca chega ao browser.

## Health probe

Com usuário autenticado:

```http
GET /api/nexoffice/health
Authorization: Bearer <supabase access token>
```

Retorno seguro inclui apenas:

- `configured`
- `reachable`
- `featureEnabled`
- `service`
- `capabilities`
- `externalEffects`
- `workspaceMode`
- `memberRole`

O probe não provisiona workspace, não cria sessão e não dispara qualquer operação financeira, mensagem ou documento.

## Web primeiro

O launcher está deliberadamente oculto no app nativo Capacitor no primeiro rollout. A validação começa na web para evitar abrir um fluxo externo de SSO dentro do Android antes do runtime estar estabilizado.

## Checklist para habilitação

1. NexOffice API e PostgreSQL dedicados disponíveis.
2. Bridge server-to-server configurado nos dois runtimes.
3. `GET /api/nexoffice/health` retorna `configured=true` e `reachable=true`.
4. Validar titular, assistente e viewer numa mesma conta SindCopilot.
5. Confirmar que todos chegam ao mesmo workspace com roles corretas.
6. Manter efeitos externos do NexOffice desligados durante essa validação.
7. Só então habilitar `VITE_NEXOFFICE_ENABLED=true` no ambiente web escolhido.

Cobrança Pix, WhatsApp, fiscal e demais efeitos continuam sujeitos aos gates e aprovações próprias do NexOffice e de seus providers.