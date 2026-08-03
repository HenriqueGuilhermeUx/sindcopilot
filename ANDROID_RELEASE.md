# SindCopilot Android — APK, AAB e Google Play

## Identificação permanente

- App: `SindCopilot`
- Package name: `com.sindcopilot.app`
- Backend: `https://sindcopilot.com`
- WebView local: arquivos compilados em `dist/client`
- API Android: `https://sindcopilot.com/api`
- Android mínimo: API 24
- Target/compile SDK: API 36

## Estrutura

O aplicativo Android usa Capacitor e empacota o mesmo frontend React utilizado pelo SindCopilot web. O conteúdo do app é compilado dentro do APK/AAB; autenticação e dados continuam sincronizados com Supabase e com o backend de produção.

Arquivos principais:

- `capacitor.config.ts`
- `src/lib/runtime.ts`
- `src/components/MobileAppNav.tsx`
- `scripts/generate-mobile-assets.mjs`
- `scripts/patch-capacitor-android.mjs`
- `.github/workflows/android-apk.yml`
- `.github/workflows/android-release.yml`

## Secrets esperados no GitHub

Em `Settings → Secrets and variables → Actions`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Nunca versione a upload key, senha ou conteúdo Base64 no repositório.

## Gerar APK instalável

GitHub:

`Actions → Android APK Teste → Run workflow`

O workflow:

1. executa TypeScript e testes;
2. gera os assets oficiais;
3. compila o frontend com o backend de produção;
4. cria o projeto Android;
5. aplica ícones e splash;
6. compila e verifica o APK;
7. publica o arquivo em `Artifacts` com checksum SHA-256.

O APK de teste usa a assinatura de debug do Android e serve para instalação direta. Ele não deve ser enviado como atualização de uma versão de produção.

## Gerar APK e AAB de produção

GitHub:

`Actions → Android Release APK e AAB → Run workflow`

Informar:

- `version_code`: número inteiro maior que a última versão enviada à Play;
- `version_name`: versão pública, por exemplo `1.1.0`.

O workflow restaura a upload key a partir dos Secrets, compila `assembleRelease` e `bundleRelease`, verifica assinaturas, testa a integridade do AAB e publica:

- `SindCopilot-VERSAO-release.apk`
- `SindCopilot-VERSAO-play.aab`
- `SHA256SUMS.txt`
- `UPLOAD_CERTIFICATE_FINGERPRINTS.txt`

O arquivo enviado à Play Console é o `.aab`.

## Gerar ou recuperar uma nova upload key

Somente quando ainda não existir uma upload key do pacote:

`Actions → Gerar Upload Key Android → Run workflow`

O artefato fica disponível por sete dias e contém:

- arquivo `.jks`;
- versão Base64 para o Secret `ANDROID_KEYSTORE_BASE64`;
- certificado público PEM;
- fingerprints SHA-1 e SHA-256.

A chave deve ser guardada fora do GitHub em local seguro. Para um pacote já publicado, use sempre a mesma upload key ou o processo oficial de redefinição da Play Console.

## Gerar imagens da Google Play

`Actions → Gerar Assets Android e Google Play → Run workflow`

O workflow gera, valida dimensões e versiona:

- ícone 512 × 512;
- imagem de destaque 1024 × 500;
- seis capturas 1080 × 1920;
- ícones adaptativos Android;
- splash screens.

Os PNGs ficam em:

- `play-store/generated/`
- `assets/`

## Build local opcional

```bash
npm install
npm run mobile:assets
VITE_NATIVE_APP=true \
VITE_API_BASE_URL=https://sindcopilot.com \
VITE_SUPABASE_URL=... \
VITE_SUPABASE_ANON_KEY=... \
npm run build:native
npx cap add android
npx cap sync android
npx capacitor-assets generate --android
node scripts/patch-capacitor-android.mjs
cd android
./gradlew assembleDebug
```

Para release local, a upload key precisa estar em `android/app/sindcopilot-release.jks` e as quatro variáveis de assinatura devem estar disponíveis no ambiente.

## Checklist antes do envio

- Typecheck, testes e build aprovados.
- APK instalado e login validado.
- Câmera e upload testados.
- Modo Visita testado online e offline.
- Exclusão de conta validada.
- Nenhum botão de pagamento externo exibido no Android.
- AAB assinado com a upload key correta.
- `versionCode` incrementado.
- Ícone, screenshots e textos conferidos com `play-store/asset-map.md`.
- Conta de demonstração preenchida nas instruções de acesso da Play Console.
