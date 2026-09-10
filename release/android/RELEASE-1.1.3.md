# SindCopilot Android 1.1.3

- Package: `com.sindcopilot.app`
- Version name: `1.1.3`
- Version code: `4`
- Target SDK: 36
- Backend de produção: `https://sindcopilot.com`

## Destaques

Esta release leva para o aplicativo Android a nova Central de Ocorrências e Governança já publicada na plataforma web.

### Ocorrências

- registro rápido de caso por condomínio e unidade;
- categoria, gravidade, data, local e responsável pelo relato;
- fotos, vídeos, áudios, PDFs e testemunhos;
- hash SHA-256 para evidências enviadas diretamente ao caso;
- manifestação/defesa do morador;
- linha do tempo completa;
- histórico de reincidência;
- vínculo com Convenção, Regimento e demais documentos internos;
- sugestão de regra a partir dos documentos indexados;
- geração de minutas de notificação, advertência e multa para revisão humana;
- Verificador de Consistência como apoio de processo, sem substituir orientação jurídica;
- dossiê PDF do caso.

### Integração com Modo Visita

Itens marcados como Atenção ou Urgente durante uma vistoria passam a gerar ocorrências rastreáveis vinculadas à visita, além das pendências operacionais já existentes.

## Validação esperada do pipeline

O workflow de release deve executar TypeScript, testes, geração dos assets oficiais, build nativo, criação/sincronização do Android, aplicação do versionCode/versionName/API 36, assinatura com a upload key existente, `assembleRelease`, `bundleRelease`, `apksigner verify`, `jarsigner -verify` e teste de integridade do AAB.

## Google Play — O que há de novo

Nova Central de Ocorrências com evidências, testemunhos, manifestações, reincidência, regras internas, linha do tempo e dossiê PDF. O Modo Visita agora transforma achados relevantes em casos rastreáveis e o novo Verificador de Consistência ajuda a revisar evidências e tratamento uniforme antes de medidas disciplinares.
