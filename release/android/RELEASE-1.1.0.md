# SindCopilot Android 1.1.0

## Identificação

- Aplicativo: `SindCopilot`
- Package name: `com.sindcopilot.app`
- Version name: `1.1.0`
- Version code: `1`
- Android mínimo: API 24
- Compile/target SDK: API 36
- Backend: `https://sindcopilot.com`

## Binários verificados

| Arquivo | SHA-256 |
|---|---|
| `SindCopilot-1.1.0-release.apk` | `305dc9e658ab0b21516e000fd61203b66f230e1654ff09338ffca5139110b5a3` |
| `SindCopilot-1.1.0-play.aab` | `a2c9a7b2ec064fb578ed385726789054ea041f0fe214697d146defbeef1f1460` |

O workflow executou TypeScript, testes, build nativo, geração dos assets, Gradle release, verificação do APK com `apksigner`, verificação do AAB com `jarsigner` e teste de integridade do bundle.

## Certificado da upload key

- SHA-1: `49:72:5A:AD:03:47:8F:AD:61:67:DA:FA:88:52:87:00:90:08:65:23`
- SHA-256: `94:C8:08:D5:D8:49:D4:DB:7B:71:D3:57:8A:B0:73:9F:B4:97:3F:F3:3D:5F:08:A3:B6:4D:1A:23:1C:6A:AA:E9`

## GitHub Actions

- Workflow run: `30776010419`
- Artifact: `8842105004`
- Nome: `SindCopilot-1.1.0-Android-Play-assinado`
- Resultado: `success`

Os binários são mantidos como artefatos de release, não dentro do histórico Git. O backup da upload key deve permanecer fora do repositório e ser configurado nos GitHub Actions Secrets para as próximas versões, conforme `ANDROID_RELEASE.md`.

## Materiais da Google Play

Os arquivos oficiais ficam em:

- `play-store/generated/icon-512.png`
- `play-store/generated/feature-graphic-1024x500.png`
- `play-store/generated/phone-01-hoje.png`
- `play-store/generated/phone-02-modo-visita.png`
- `play-store/generated/phone-03-ocorrencia.png`
- `play-store/generated/phone-04-compliance.png`
- `play-store/generated/phone-05-documentos-ia.png`
- `play-store/generated/phone-06-offline.png`

Textos e declarações:

- `play-store/listing-pt-BR.md`
- `play-store/data-safety.md`
- `play-store/review-notes.md`
- `play-store/asset-map.md`
