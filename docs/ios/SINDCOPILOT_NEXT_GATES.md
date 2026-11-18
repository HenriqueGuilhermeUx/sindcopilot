# SindCopilot — iOS individual QA and commercial readiness

Status: **Fase 1 / unsigned build and simulator smoke confirmed; functional and commercial Apple readiness NOT confirmed**.

## Verified evidence

- [PR #32](https://github.com/HenriqueGuilhermeUx/sindcopilot/pull/32) — isolated branch `chore/ios-appstore-readiness-20261109`; no merge or release authorized.
- [GitHub Actions #42693008331](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/42693008331) — macOS `simulator` job SUCCESS: install JS deps, ephemeral Capacitor iOS dependency, generate iOS project, Xcode unsigned build, simulator launch smoke and archive unsigned .app.
- `capacitor.config.ts`: `appId: com.sindcopilot.app`, `appName: SindCopilot`, `webDir: dist/client`. Verify package identity against Play Console and last distributed AAB before Apple account enrollment.
- `package.json` declares Capacitor 8, Supabase, tRPC, Camera, Filesystem, Share, Network; scripts `build:native` and `android:aab`. **Declared deps are not evidence of functional iOS support**; verify native permissions, server connectivity and privacy.

## Must-pass scenarios before Fase 2 (all unverified)

| Area | Required evidence | Status |
| --- | --- | --- |
| Commercial origin | Published Play package/AAB commit, company owner, final iOS ID | BLOCKED |
| App shell | Official icon/splash, on-device UI, screenshots and rotation/accessibility | UNTESTED |
| Authentication | Sign-up/login, recovery, logout, session persistence after restart; account deletion when required | UNTESTED |
| Condominium isolation | Different condos/users/roles cannot access each other's records, exports or attachments | UNTESTED |
| Financial import | CSV, XLSX, OFX and PDF sample imports with no real account data; error/retry/duplicate handling | UNTESTED |
| Finance reconciliation | Transaction classification, validation, balances, audit trail, original attachment access and PDF statement | UNTESTED |
| Native integrations | Camera/filesystem/share permissions, denied authorization, unavailable offline assets and share sheet | UNTESTED |
| Backend | HTTPS production-equivalent staging API, session expiry, error/no network and re-auth; no localhost URLs | UNTESTED |
| Apple privacy | App Privacy data inventory, privacy manifest, third-party SDK inventory, data retention/deletion | UNTESTED |
| Store policy | Digital monetization/IAP applicability, support links, Apple business identity, test credentials in secure channel | UNTESTED |

## Execution discipline

1. Use **synthetic** condominium and banking fixtures only; no originals, financial statements, password exports or user data in CI.
2. Test iPhone simulator and real-device capabilities separately; a simulator launch does not prove camera, document sharing or file import.
3. Keep Android app and production untouched. Any shared-client modification must be separately reviewed for regressions.
4. Ensure QA evidence (screenshots, logs, expected/actual outcome) and every user-visible feature are validated before enabling release signing.
5. No TestFlight, provisioning, upload or merges under this Phase 1 document.

Central: [Alternative Ventures iOS tracker](https://github.com/HenriqueGuilhermeUx/alternativeventures/issues/4).

## Revisão incremental de dependências nativas — 13/11/2026

Verificação direta da branch iOS `package.json` e `capacitor.config.ts`:

- O build utiliza **Capacitor 8**, `webDir: dist/client` e Android `com.sindcopilot.app`; o ID de código não confirma a ficha Play comercial.
- Existem dependências declaradas `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/network`, `@capacitor/device`, `@capacitor/haptics`, teclado e status bar. Mesmo se instaladas no build, cada permissão/recurso requer teste próprio no iPhone, especialmente a recusa de câmera/fotos e compartilhamento de PDFs.
- O projeto depende de `xlsx` baixado de `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. O uso desse pacote e sua disponibilidade na CI não comprovam importação de XLSX no app iOS; testar arquivo via seletor de documentos, formatos malformados, limites de tamanho e duplicidade. Não incorporar extratos financeiros reais às evidências.
- O `capacitor.config.ts` define `server.cleartext: false`, e `android.allowMixedContent: false`. São escolhas de código, **não comprovação** de que todos os endpoints usados em iOS são HTTPS ou de que não há conteúdo misto.
- Para validar segurança de dados multi-condomínio, usar **dois condomínios e dois usuários fictícios** e confirmar falha controlada de acesso cruzado tanto em lista como em PDF, importações e arquivos. Os controles Supabase/tRPC precisam ser exercitados no servidor de homologação, não apenas na interface.

### Critérios de saída que não podem ser inferidos do preflight

1. Prova Play Console/AAB e identificação final da empresa Apple.
2. Evidência de importação/retorno de XLSX, OFX, CSV e PDF com fixtures sintéticas.
3. Permissões iOS reais e fallback de recusa de câmera/arquivos.
4. Captura de rede e autenticação com endpoint de homologação seguro, sem dados pessoais.
5. Revisão de App Privacy/Privacy Manifest e descarte de extrato original e outros documentos pessoais.

Nenhum item foi marcado como homologado nesta revisão. Não modificar dependências compartilhadas ou Android sem análise separada.

## Pacote automatizado de dados sintéticos — 13/11/2026

O PR de preparação passou a conter `scripts/ios/generate-synthetic-import-fixtures.mjs`, sem qualquer dado pessoal ou financeiro de clientes. O gerador produz um condomínio e uma conta **inteiramente fictícios**, três lançamentos determinísticos: crédito de R$ 1.500,00, débitos de R$ 280,40 e R$ 119,60, total líquido de **R$ 1.100,00**. Formatos produzidos: `CSV`, `XLSX`, `OFX`, mais `README.md` com valores esperados. O saldo inicial do extrato OFX é artificial.

A workflow `.github/workflows/ios-preflight.yml` possui agora um job Ubuntu separado (`synthetic-import-fixtures`) que instala as dependências, gera esses arquivos e os arquiva como `ios-synthetic-bank-import-fixtures`. O smoke nativo de iPhone continua separado e passou a exigir `CFBundleIdentifier=com.sindcopilot.app` e arquivar screenshot após `simctl launch`. Alterações apenas em branch iOS sem assinatura.

**Atenção:** gerar arquivos não é executar o parser, reconciliar lançamentos, conferir duplicidade, abrir PDF, validar acesso cruzado ou homologar o produto. Esses gates seguem **UNTESTED** até um operador/teste automatizado consumir as fixtures através do fluxo real em servidor e iPhone de homologação. Não levar dados ou URLs de produção ao CI.

Referências: commits `2691678` (gerador), `54c2d9a` (screenshot + bundle ID) e `754aa31` (CI para fixtures). Conferir conclusão dos jobs antes de marcar as novas alterações como PASS.

## CI green e read-back sintético (15/11/2026)

- [Run 43502933973](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/43502933973) encerrou **SUCCESS nos dois jobs**: `simulator` e `synthetic-import-fixtures`. Evidências GitHub: screenshot ID `14075438005`, .app unsigned ID `14074094974`, fixtures ID `14075237359`, log Xcode ID `14076200275`. Captura ainda sem revisão visual humana.
- O erro anterior do gerador XLSX foi solucionado no commit `a3da507`; **isso não prova o parser de importação real** do aplicativo.
- Adicionado script `scripts/ios/verify-synthetic-import-fixtures.mjs` (commit `267f93a`), que relê CSV, XLSX e OFX gerados, confronta 3 IDs/datas/valores em cada formato e o líquido fictício de R$ 1.100,00, sem banco, rede ou dados reais. O CI foi ampliado no commit `3ed0bb6` para exigir a verificação antes do arquivamento.
- **A nova verificação só pode ser marcada PASS quando o novo job concluir.** Ainda permanecem pendentes importação pelo código de produção, classificação, conciliação, extratos/PDF, autenticação e segregação de condomínios.

## Teste do parser de produção isolado, sem banco (15/11/2026)

A [execução #43762801080](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/43762801080) concluiu com os jobs `simulator` e `synthetic-import-fixtures` **SUCCESS**, comprovando tanto a nova compilação/abertura iOS quanto a geração + read-back de extratos fictícios.

Identificado o parser usado pelo backend em `src/server/finance-api.ts`: `parseStatement`, `parseOfx` e `rowsToStatement`. O frontend `src/pages/Financeiro.tsx` envia o arquivo com `fileToBase64` para `importStatement`, que chama uma API protegida e depois armazena dados no Supabase. Para não tocar produção, incluído `scripts/ios/test-real-statement-parser.mjs` (commit `c3ddff4`), que extrai e transpila apenas o segmento de código real do parser, sem inicializar Express, Supabase, serviços externos ou credenciais. A workflow iOS foi atualizada no commit `4f556c4` para comparar o resultado real do parser de CSV, XLSX e OFX: quantidade, datas, direção, centavos, período e saldo de R$ 1.100,00, além de FITIDs OFX.

**O teste do parser só recebe PASS após resultado verde específico do novo CI.** Mesmo aprovado, não seria prova de upload real, persistência, isolamento de condomínio, conciliação, anexos PDF ou funcionalidade do app iOS no dispositivo. Esses gates permanecem pendentes.

## Import endpoint integration harness — 15/11/2026

The [previous CI run #43765550320](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/43765550320) completed **SUCCESS** for both `simulator` and `synthetic-import-fixtures`. It includes the offline bank parser, access guard and reconciliation tests.

The new `scripts/ios/test-import-route-offline.mjs` executes the **genuine** `financeRouter.post("/import")` handler and `requireUser` middleware extracted from `src/server/finance-api.ts` with an in-memory stub implementation of Supabase, object storage and condominium access (no service account, network, production or human data). It asserts:
- Unauthenticated: 401; foreign condominium: 403.
- Successful import of each synthetic CSV, XLSX and OFX with 3 entries, correct cents and ownership: 201.
- Duplicate same bytes/condominium/owner: 409 and no additional stored records.
- Same synthetic bytes under another authorized fictional owner + separate condominium: successful isolation.
- Imported statements with unclassified entries remain in `review`, not falsely reconciled.

Workflow integration: commits `a4271ac` and `699ea06`, [run #43767240402](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/43767240402). **Do not mark this specific test PASS until the CI job finishes green.**

This validates endpoint logic with **mocks**, not real authenticated HTTP, RLS, Supabase Storage ACLs, backend deployment, iPhone file picker or real multi-tenant database authorization. Those remain mandatory release gates. No Apple release or merge.

## Real Supabase staging discovery and read-only gate — 15/11/2026

**Current connector audit:** Only Finsight (inactive), `av-os-data-hub` (active), and `mindsteps.org` (active) are visible on the connected Supabase account. **None is verified as a SindCopilot staging database.** The `av-os-data-hub` public schema contains AV/market/financial intelligence tables and **not** the SindCopilot `financial_statements`, `financial_transactions`, `condominiums` tables required by the repo. Its branching list is empty. Do not repurpose those unrelated projects or write fictitious condominium records there.

A read-only SQL metadata audit is provided at `docs/ios/sindcopilot-staging-readonly-audit.sql`: expected tables, RLS enabled flags, grants for `anon`/`authenticated`, constraints/indexes and the private Storage bucket metadata. **It has not been executed on SindCopilot**, because no isolated project is verified. No database changes, seed, Auth users or Storage records were made.

**Source review of `supabase/migrations/0006_financeiro_inteligente.sql`:** four financial tables have RLS enabled and direct `anon`/`authenticated` table privileges revoked; backend imports use `service_role` and enforce access with `db.assertCondominium`. This needs server/RLS and token tests on a genuinely isolated staging instance. The duplicate check uses `sha256` before import but there is no unique constraint on `user_id,condominium_id,sha256` in migration 0006; simultaneous duplicate uploads may race. The error cleanup in `finance-api.ts` removes the uploaded object but does not clearly roll back a statement inserted before a later transaction insert failure. **Both risks are release blockers pending transactional and idempotency tests.**

**Confirmed CI:** [run #43767396561](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/43767396561) PASS for both unsigned simulator and offline import endpoint harness. No evidence yet of authenticated HTTP, database isolation, RLS, file picker or iOS production-equivalent QA.

Before real staging import, establish the correct *dedicated* SindCopilot staging project/branch or approved ephemeral environment, ensure completely synthetic data, and check running migrations and storage bucket on it. Never substitute the AV shared database.

## Segurança de importação — correção incremental isolada (16/11/2026)

**Código alterado apenas na branch draft iOS (também é backend compartilhado; não efetuar merge sem revisão):**
- Commit `27c1f5f` modifica `src/server/finance-api.ts` para acompanhar o extrato inserido e, ao ocorrer erro **após** a inserção, tentar excluí-lo por `id`, `user_id` e `condominium_id`. A FK com `ON DELETE CASCADE` da migration 0006 remove lançamentos vinculados quando essa compensação funciona. A limpeza do objeto no Storage agora também registra erros em vez de ignorá-los. Erro Postgres `23505` de violação de índice de unicidade é traduzido para conflito de duplicata (HTTP 409).
- Commit `6c89452` amplia o teste isolado `test-import-route-offline.mjs` com simulação de falha na inserção de transações e comprovação de limpeza dos registros/objetos **nos mocks**, além de teste de conflito de unicidade na inserção, com lookup de duplicidade artificialmente omitido.
- Commit `07f8a9f` adiciona **somente como proposta NÃO aplicada** `docs/ios/sindcopilot-unique-sha-staging-candidate.sql`, com verificação prévia de duplicatas e índice único parcial em `(user_id, condominium_id, sha256) WHERE sha256 IS NOT NULL`. Esse índice precisa ser revisado, testado e efetivamente implantado **apenas em staging SindCopilot identificado**, antes de se afirmar proteção de concorrência.

**Limites de segurança:** o cleanup compensatório NÃO é uma transação atômica entre Storage e Postgres. Caso a compensação falhe, ainda pode restar registro parcial; para garantia final, é preciso RPC/transação Postgres e reconciliação assíncrona de arquivos. A migração única não foi executada em nenhum Supabase. O novo teste ainda requer CI concluído, e a homologação E2E permanece bloqueada por falta de projeto Supabase SindCopilot isolado. Não alterar o app Android publicado, o esquema de produção ou o Netlify.
