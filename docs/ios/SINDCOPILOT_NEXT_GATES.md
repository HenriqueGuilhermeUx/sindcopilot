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
