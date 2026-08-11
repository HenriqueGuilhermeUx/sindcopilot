# SindCopilot Android 1.1.2 — Correção Google Play

- App: SindCopilot
- Package/applicationId: `com.sindcopilot.app`
- Version name: `1.1.2`
- Version code: `3`
- Target SDK: `36`
- Backend esperado: SindCopilot API `1.2.1`

## Motivo da release

Correção da falha de funcionalidade reportada pela Google Play na tela Assistente IA.

## Correções

- CORS explícito para a origem segura do Capacitor Android (`https://localhost`).
- Nova rota autenticada `POST /api/assistant/chat`.
- Timeout e retry para falhas transitórias do provedor de IA.
- Resposta operacional de contingência quando o provedor está indisponível.
- Estado de erro visível e acionável com botão **Tentar novamente**.
- Perguntas sugeridas enviadas diretamente ao toque.
- Ícones decorativos do chat sem comportamento/aparência de botão.
- Atalhos móveis revisados para executar exatamente a ação descrita.
- Notas específicas para o revisor atualizadas em `play-store/review-notes.md`.

## Validações executadas

- TypeScript: aprovado.
- Testes automatizados: aprovados.
- Build web: aprovado.
- Build nativo Android: aprovado.
- APK release: compilado.
- AAB release: compilado.
- Package e versionName conferidos no App Bundle.
- AAB final assinado com a mesma upload key usada anteriormente.
- Certificado de upload SHA-1: `49:72:5A:AD:03:47:8F:AD:61:67:DA:FA:88:52:87:00:90:08:65:23`.
- Certificado de upload SHA-256: `94:C8:08:D5:D8:49:D4:DB:7B:71:D3:57:8A:B0:73:9F:B4:97:3F:F3:3D:5F:08:A3:B6:4D:1A:23:1C:6A:AA:E9`.

## Verificação no domínio oficial

Após o deploy do backend:

- `/api/health` retornou versão `1.2.1`.
- Preflight `OPTIONS /api/assistant/chat` com `Origin: https://localhost` retornou HTTP `204`.
- A resposta incluiu `Access-Control-Allow-Origin: https://localhost`.
- POST sem autenticação atingiu a rota do Assistente e retornou HTTP `401` com mensagem de sessão expirada, comprovando que o WebView Android consegue alcançar o backend.

## AAB final

SHA-256 do AAB assinado:

`20cf316641250cba7abaa2dca7fa5e31289600b255d982f5bc15aa5efe7d3907`

O binário assinado não é versionado no repositório. O código, workflows, metadados e registro auditável da release permanecem no GitHub; o AAB é entregue fora do repositório para envio à Play Console.
