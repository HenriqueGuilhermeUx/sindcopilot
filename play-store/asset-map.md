# Mapa dos assets oficiais do SindCopilot

Os arquivos são gerados por `scripts/generate-mobile-assets.mjs`. A mesma geometria, cores e símbolo são usados no launcher Android, splash screen, PWA e materiais da Google Play.

## Identidade

| Arquivo | Dimensão | Uso |
|---|---:|---|
| `play-store/generated/icon-512.png` | 512 × 512 | Ícone da ficha da Google Play |
| `assets/icon-only.png` | 1024 × 1024 | Fonte do ícone Android legado |
| `assets/icon-foreground.png` | 1024 × 1024 | Foreground do ícone adaptativo |
| `assets/icon-background.png` | 1024 × 1024 | Background do ícone adaptativo |
| `assets/splash.png` | 2732 × 2732 | Splash screen claro |
| `assets/splash-dark.png` | 2732 × 2732 | Splash screen escuro |
| `public/app-icon-512.png` | 512 × 512 | Referência pública da marca no site |

## Imagem de destaque

| Arquivo | Dimensão | Mensagem |
|---|---:|---|
| `play-store/generated/feature-graphic-1024x500.png` | 1024 × 500 | Gestão de condomínios no bolso |

## Capturas para smartphone

| Ordem | Arquivo | Dimensão | Funcionalidade real representada |
|---:|---|---:|---|
| 1 | `phone-01-hoje.png` | 1080 × 1920 | Dashboard, obrigações, tarefas e atividades |
| 2 | `phone-02-modo-visita.png` | 1080 × 1920 | Checklist, prioridades e progresso da vistoria |
| 3 | `phone-03-ocorrencia.png` | 1080 × 1920 | Foto, observação, prioridade, responsável e prazo |
| 4 | `phone-04-compliance.png` | 1080 × 1920 | Agenda de obrigações e alertas de vencimento |
| 5 | `phone-05-documentos-ia.png` | 1080 × 1920 | Documentos, OCR e consulta com fonte |
| 6 | `phone-06-offline.png` | 1080 × 1920 | Rascunho local e sincronização do Modo Visita |

## Coerência entre app e ficha

- O símbolo é um prédio com selo ciano de confirmação em fundo azul-marinho.
- A navegação exibida nas capturas segue a barra do aplicativo: Hoje, Visitas, Registrar, Pendências e Mais.
- Nenhuma captura promete pagamento, contabilidade, assembleia eletrônica ou função que não faça parte da versão Android.
- Os textos da ficha usam os mesmos nomes da interface: Modo Visita, Compliance, Documentos, Assistente IA e Fornecedores.
- Toda alteração visual deve ser feita primeiro no gerador e depois regenerada pelo workflow `Gerar Assets Android e Google Play`.

## Controle de geração

O arquivo `play-store/generated/assets.json` registra a marca, o pacote Android e a lista de arquivos gerados. O workflow valida automaticamente as dimensões antes de versionar os PNGs.
