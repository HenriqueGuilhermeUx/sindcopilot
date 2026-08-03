import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetsDir = path.join(root, "assets");
const playDir = path.join(root, "play-store", "generated");
const publicDir = path.join(root, "public");

await Promise.all([
  fs.mkdir(assetsDir, { recursive: true }),
  fs.mkdir(playDir, { recursive: true }),
  fs.mkdir(publicDir, { recursive: true }),
]);

const C = {
  navy: "#0f172a",
  navy2: "#12334d",
  cyan: "#22d3ee",
  cyan2: "#67e8f9",
  blue: "#2563eb",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  paper: "#f8fafc",
  white: "#ffffff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
};

function svgStart(width, height, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${extra}>`;
}

function logoMark(x, y, size, withTile = true) {
  const s = size / 512;
  return `${withTile ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${112 * s}" fill="${C.navy}"/>` : ""}
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="92" y="108" width="214" height="300" rx="28" fill="${C.navy2}"/>
    <rect x="126" y="148" width="48" height="48" rx="10" fill="${C.cyan2}"/>
    <rect x="224" y="148" width="48" height="48" rx="10" fill="${C.cyan2}"/>
    <rect x="126" y="224" width="48" height="48" rx="10" fill="#cffafe"/>
    <rect x="224" y="224" width="48" height="48" rx="10" fill="#cffafe"/>
    <rect x="171" y="324" width="58" height="84" rx="10" fill="${C.white}"/>
    <circle cx="349" cy="326" r="92" fill="${C.cyan}"/>
    <path d="M306 326l29 30 58-67" fill="none" stroke="#082f49" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function iconSvg(size, foregroundOnly = false, backgroundOnly = false) {
  if (backgroundOnly) {
    return `${svgStart(size, size)}<rect width="${size}" height="${size}" fill="${C.navy}"/></svg>`;
  }
  if (foregroundOnly) {
    return `${svgStart(size, size)}${logoMark(0, 0, size, false)}</svg>`;
  }
  return `${svgStart(size, size)}${logoMark(0, 0, size, true)}</svg>`;
}

function splashSvg(width, height) {
  const mark = Math.round(Math.min(width, height) * 0.28);
  const x = Math.round((width - mark) / 2);
  const y = Math.round((height - mark) / 2 - 80);
  return `${svgStart(width, height)}
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${C.navy}"/><stop offset="1" stop-color="#164e63"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    ${logoMark(x, y, mark, false)}
    <text x="${width / 2}" y="${y + mark + 110}" text-anchor="middle" fill="${C.white}" font-family="Arial, sans-serif" font-size="64" font-weight="700">SindCopilot</text>
    <text x="${width / 2}" y="${y + mark + 168}" text-anchor="middle" fill="#a5f3fc" font-family="Arial, sans-serif" font-size="30">Gestão condominial no bolso</text>
  </svg>`;
}

function featureGraphicSvg() {
  return `${svgStart(1024, 500)}
    <defs>
      <linearGradient id="featureBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${C.navy}"/><stop offset="1" stop-color="#0e7490"/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-opacity=".25"/></filter>
    </defs>
    <rect width="1024" height="500" fill="url(#featureBg)"/>
    <circle cx="900" cy="80" r="180" fill="#22d3ee" opacity=".12"/>
    <circle cx="90" cy="480" r="220" fill="#2563eb" opacity=".16"/>
    ${logoMark(70, 62, 92, false)}
    <text x="70" y="205" fill="${C.white}" font-family="Arial, sans-serif" font-size="50" font-weight="800">Gestão de condomínios</text>
    <text x="70" y="263" fill="#a5f3fc" font-family="Arial, sans-serif" font-size="50" font-weight="800">no bolso</text>
    <text x="70" y="324" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="24">Vistorias, pendências, documentos e IA</text>
    <g transform="translate(645 38)" filter="url(#shadow)">
      <rect width="300" height="424" rx="42" fill="#020617"/>
      <rect x="12" y="12" width="276" height="400" rx="32" fill="${C.paper}"/>
      <rect x="34" y="42" width="232" height="68" rx="18" fill="${C.navy}"/>
      <text x="54" y="72" fill="${C.white}" font-family="Arial" font-size="18" font-weight="700">Modo Visita</text>
      <text x="54" y="96" fill="#a5f3fc" font-family="Arial" font-size="12">Edifício Solar</text>
      ${[0,1,2,3].map((i)=>`<rect x="34" y="${132+i*58}" width="232" height="44" rx="14" fill="${i===2?"#fff7ed":"#ffffff"}" stroke="${i===2?"#fdba74":C.line}"/><circle cx="54" cy="${154+i*58}" r="9" fill="${i===2?C.amber:C.green}"/><text x="72" y="${160+i*58}" fill="${C.ink}" font-family="Arial" font-size="12">${["Portaria e acesso","Garagem","Elevadores","Extintores"][i]}</text>`).join("")}
      <rect x="34" y="370" width="232" height="22" rx="11" fill="#e2e8f0"/>
      <rect x="34" y="370" width="186" height="22" rx="11" fill="${C.cyan}"/>
    </g>
  </svg>`;
}

function nav(active) {
  const items = [
    ["Hoje", "⌂"],
    ["Visitas", "✓"],
    ["Registrar", "+"],
    ["Pendências", "!"],
    ["Mais", "•••"],
  ];
  return `<rect x="0" y="1748" width="1080" height="172" fill="#ffffff"/><line x1="0" y1="1748" x2="1080" y2="1748" stroke="${C.line}"/>
    ${items.map((item,i)=>{
      const x=108+i*216;
      const selected=item[0]===active;
      const circle=item[0]==="Registrar";
      return `${circle?`<circle cx="${x}" cy="1782" r="44" fill="${C.blue}"/><text x="${x}" y="1798" text-anchor="middle" fill="white" font-family="Arial" font-size="48">+</text>`:`<text x="${x}" y="1802" text-anchor="middle" fill="${selected?C.blue:C.muted}" font-family="Arial" font-size="34" font-weight="700">${item[1]}</text>`}<text x="${x}" y="1850" text-anchor="middle" fill="${selected?C.blue:C.muted}" font-family="Arial" font-size="20" font-weight="${selected?700:500}">${item[0]}</text>`;
    }).join("")}`;
}

function header(title, subtitle, badge = "") {
  return `<rect width="1080" height="280" fill="${C.navy}"/>
    ${logoMark(54, 52, 80, false)}
    <text x="156" y="94" fill="${C.white}" font-family="Arial" font-size="34" font-weight="800">SindCopilot</text>
    <text x="54" y="188" fill="${C.white}" font-family="Arial" font-size="54" font-weight="800">${title}</text>
    <text x="54" y="232" fill="#cbd5e1" font-family="Arial" font-size="25">${subtitle}</text>
    ${badge ? `<rect x="820" y="58" width="206" height="52" rx="26" fill="#164e63"/><text x="923" y="92" text-anchor="middle" fill="#a5f3fc" font-family="Arial" font-size="20" font-weight="700">${badge}</text>` : ""}`;
}

function card(x,y,w,h,title,subtitle,accent=C.blue) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${C.white}" stroke="${C.line}"/>
    <rect x="${x}" y="${y}" width="10" height="${h}" rx="5" fill="${accent}"/>
    <text x="${x+34}" y="${y+52}" fill="${C.ink}" font-family="Arial" font-size="28" font-weight="700">${title}</text>
    <text x="${x+34}" y="${y+88}" fill="${C.muted}" font-family="Arial" font-size="21">${subtitle}</text>`;
}

function screenshotSvg(kind) {
  const base = `${svgStart(1080, 1920)}<rect width="1080" height="1920" fill="${C.paper}"/>`;
  if (kind === "today") {
    return `${base}${header("Seu dia sob controle","O que precisa de atenção agora","3 condomínios")}
      ${card(54,330,300,188,"2","urgências",C.red)}${card(390,330,300,188,"5","tarefas hoje",C.amber)}${card(726,330,300,188,"8","prazos próximos",C.blue)}
      <text x="54" y="594" fill="${C.ink}" font-family="Arial" font-size="34" font-weight="800">Prioridades</text>
      ${card(54,630,972,150,"AVCB vence em 7 dias","Edifício Solar · obrigação legal",C.red)}
      ${card(54,806,972,150,"Vistoria da garagem","Residencial Atlântico · hoje às 15h",C.amber)}
      ${card(54,982,972,150,"Fornecedor aguardando retorno","Manutenção do portão · 2 dias",C.blue)}
      <text x="54" y="1208" fill="${C.ink}" font-family="Arial" font-size="34" font-weight="800">Atividade recente</text>
      ${card(54,1244,972,142,"Relatório de visita concluído","Edifício Horizonte · há 22 min",C.green)}
      ${card(54,1412,972,142,"Nota fiscal processada pela IA","Elevadores Alfa · há 1h",C.cyan)}
      ${nav("Hoje")}</svg>`;
  }
  if (kind === "visit") {
    return `${base}${header("Modo Visita","Checklist rápido, fotos e prazos","Offline pronto")}
      <rect x="54" y="320" width="972" height="122" rx="28" fill="#ecfeff" stroke="#67e8f9"/>
      <text x="84" y="368" fill="#155e75" font-family="Arial" font-size="28" font-weight="800">Edifício Solar</text>
      <text x="84" y="405" fill="#0e7490" font-family="Arial" font-size="21">Rua das Palmeiras, 120 · visita em andamento</text>
      <text x="54" y="514" fill="${C.ink}" font-family="Arial" font-size="30" font-weight="800">Progresso da vistoria</text>
      <rect x="54" y="546" width="972" height="26" rx="13" fill="#e2e8f0"/><rect x="54" y="546" width="690" height="26" rx="13" fill="${C.cyan}"/>
      ${[
        ["Portaria e controle de acesso","Conforme",C.green],
        ["Garagem e circulação","Atenção",C.amber],
        ["Elevadores","Conforme",C.green],
        ["Bombas e casa de máquinas","Urgente",C.red],
        ["Extintores e sinalização","Verificar",C.muted],
        ["Cobertura e calhas","Verificar",C.muted],
      ].map((it,i)=>`${card(54,620+i*168,972,142,it[0],it[1],it[2])}<circle cx="946" cy="${691+i*168}" r="24" fill="${it[2]}"/><path d="M934 ${691+i*168}l8 8 16-19" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>`).join("")}
      ${nav("Visitas")}</svg>`;
  }
  if (kind === "register") {
    return `${base}${header("Registrar ocorrência","Foto, prioridade, responsável e prazo","3 toques")}
      <rect x="54" y="330" width="972" height="430" rx="34" fill="#dbeafe" stroke="#93c5fd"/>
      <rect x="94" y="370" width="892" height="350" rx="24" fill="#bfdbfe"/>
      <circle cx="540" cy="520" r="72" fill="${C.blue}"/><text x="540" y="544" text-anchor="middle" fill="white" font-family="Arial" font-size="72">⌁</text>
      <text x="540" y="650" text-anchor="middle" fill="#1e3a8a" font-family="Arial" font-size="25" font-weight="700">Tirar foto ou anexar evidência</text>
      <text x="54" y="840" fill="${C.ink}" font-family="Arial" font-size="28" font-weight="800">Prioridade</text>
      <rect x="54" y="875" width="286" height="76" rx="24" fill="#ecfdf5" stroke="#6ee7b7"/><text x="197" y="923" text-anchor="middle" fill="#047857" font-family="Arial" font-size="24" font-weight="700">Normal</text>
      <rect x="397" y="875" width="286" height="76" rx="24" fill="#fffbeb" stroke="#fbbf24"/><text x="540" y="923" text-anchor="middle" fill="#92400e" font-family="Arial" font-size="24" font-weight="700">Atenção</text>
      <rect x="740" y="875" width="286" height="76" rx="24" fill="#fef2f2" stroke="#f87171"/><text x="883" y="923" text-anchor="middle" fill="#b91c1c" font-family="Arial" font-size="24" font-weight="700">Urgente</text>
      <rect x="54" y="1004" width="972" height="210" rx="28" fill="${C.white}" stroke="${C.line}"/>
      <text x="84" y="1054" fill="${C.ink}" font-family="Arial" font-size="26" font-weight="700">Observação</text>
      <text x="84" y="1110" fill="${C.muted}" font-family="Arial" font-size="23">Infiltração próxima ao quadro elétrico...</text>
      <circle cx="944" cy="1106" r="42" fill="#ecfeff"/><text x="944" y="1121" text-anchor="middle" fill="#0e7490" font-family="Arial" font-size="34">●</text>
      ${card(54,1262,972,150,"Responsável: Manutenção","Prazo automático: amanhã",C.red)}
      <rect x="54" y="1482" width="972" height="92" rx="28" fill="${C.blue}"/><text x="540" y="1540" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="800">Salvar ocorrência</text>
      ${nav("Registrar")}</svg>`;
  }
  if (kind === "compliance") {
    return `${base}${header("Prazos e obrigações","Nada importante fica para trás","Alertas ativos")}
      <text x="54" y="350" fill="${C.ink}" font-family="Arial" font-size="32" font-weight="800">Próximos 30 dias</text>
      ${[
        ["AVCB","Edifício Solar · vence em 7 dias",C.red,"7d"],
        ["Seguro condominial","Residencial Atlântico · vence em 12 dias",C.amber,"12d"],
        ["Limpeza da caixa d'água","Edifício Horizonte · vence em 18 dias",C.blue,"18d"],
        ["Manutenção dos elevadores","Edifício Solar · vence em 24 dias",C.blue,"24d"],
        ["Dedetização","Residencial Atlântico · vence em 29 dias",C.green,"29d"],
      ].map((it,i)=>`${card(54,396+i*196,972,164,it[0],it[1],it[2])}<circle cx="936" cy="${478+i*196}" r="44" fill="${it[2]}"/><text x="936" y="486" text-anchor="middle" fill="white" font-family="Arial" font-size="20" font-weight="800">${it[3]}</text>`).join("")}
      <rect x="54" y="1435" width="972" height="106" rx="30" fill="#ecfeff" stroke="#67e8f9"/><text x="84" y="1480" fill="#155e75" font-family="Arial" font-size="25" font-weight="800">Alertas inteligentes</text><text x="84" y="1516" fill="#0e7490" font-family="Arial" font-size="20">O SindCopilot avisa antes do prazo e mantém o histórico.</text>
      ${nav("Pendências")}</svg>`;
  }
  if (kind === "documents") {
    return `${base}${header("Documentos e IA","Encontre respostas com fonte e contexto","Seguro")}
      <rect x="54" y="330" width="972" height="116" rx="28" fill="${C.white}" stroke="${C.line}"/><text x="88" y="401" fill="${C.muted}" font-family="Arial" font-size="24">Pesquisar contratos, atas, regimentos...</text>
      <text x="54" y="526" fill="${C.ink}" font-family="Arial" font-size="32" font-weight="800">Assistente do condomínio</text>
      <rect x="54" y="566" width="972" height="168" rx="30" fill="#dbeafe"/><text x="84" y="620" fill="#1e3a8a" font-family="Arial" font-size="24" font-weight="700">Você</text><text x="84" y="670" fill="#1e3a8a" font-family="Arial" font-size="24">Qual é a regra para mudança aos sábados?</text>
      <rect x="54" y="758" width="972" height="348" rx="30" fill="${C.white}" stroke="${C.line}"/><text x="84" y="816" fill="#0f766e" font-family="Arial" font-size="24" font-weight="800">SindCopilot</text><text x="84" y="866" fill="${C.ink}" font-family="Arial" font-size="23">O Regimento permite mudanças aos sábados</text><text x="84" y="904" fill="${C.ink}" font-family="Arial" font-size="23">das 9h às 14h, mediante agendamento.</text><rect x="84" y="958" width="852" height="100" rx="18" fill="#f1f5f9"/><text x="108" y="1000" fill="${C.muted}" font-family="Arial" font-size="19" font-weight="700">Fonte: Regimento Interno · página 12</text><text x="108" y="1033" fill="${C.muted}" font-family="Arial" font-size="18">Capítulo IV — Uso das áreas comuns</text>
      <text x="54" y="1188" fill="${C.ink}" font-family="Arial" font-size="32" font-weight="800">Documentos recentes</text>
      ${card(54,1230,972,142,"Regimento Interno","Indexado e pronto para consulta",C.green)}
      ${card(54,1396,972,142,"Nota fiscal · Elevadores Alfa","Dados extraídos pela IA",C.cyan)}
      ${nav("Mais")}</svg>`;
  }
  return `${base}${header("Trabalhe mesmo sem sinal","A visita continua em garagens e subsolos","Offline")}
    <rect x="54" y="330" width="972" height="136" rx="30" fill="#fff7ed" stroke="#fdba74"/><circle cx="112" cy="398" r="30" fill="${C.amber}"/><text x="112" y="409" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="800">!</text><text x="164" y="382" fill="#9a3412" font-family="Arial" font-size="25" font-weight="800">Modo offline ativado</text><text x="164" y="422" fill="#9a3412" font-family="Arial" font-size="20">Fotos e checklist estão salvos neste aparelho.</text>
    <text x="54" y="554" fill="${C.ink}" font-family="Arial" font-size="32" font-weight="800">Visita em andamento</text>
    ${card(54,596,972,150,"Edifício Solar","8 de 10 itens verificados",C.cyan)}
    <rect x="54" y="786" width="972" height="28" rx="14" fill="#e2e8f0"/><rect x="54" y="786" width="778" height="28" rx="14" fill="${C.cyan}"/>
    ${card(54,870,972,160,"2 fotos aguardando envio","Sincronização automática quando a internet voltar",C.blue)}
    ${card(54,1058,972,160,"1 ocorrência urgente","Prazo e responsável já definidos",C.red)}
    <rect x="54" y="1284" width="972" height="110" rx="30" fill="#ecfdf5" stroke="#6ee7b7"/><text x="84" y="1330" fill="#047857" font-family="Arial" font-size="25" font-weight="800">Seus dados estão seguros</text><text x="84" y="1368" fill="#047857" font-family="Arial" font-size="20">A sincronização mantém o mesmo histórico do painel web.</text>
    <rect x="54" y="1460" width="972" height="92" rx="28" fill="${C.blue}"/><text x="540" y="1518" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="800">Continuar vistoria</text>
    ${nav("Visitas")}</svg>`;
}

async function render(svg, output, width, height) {
  await sharp(Buffer.from(svg)).resize(width, height).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(output);
}

await Promise.all([
  render(iconSvg(1024), path.join(assetsDir, "icon-only.png"), 1024, 1024),
  render(iconSvg(1024, true), path.join(assetsDir, "icon-foreground.png"), 1024, 1024),
  render(iconSvg(1024, false, true), path.join(assetsDir, "icon-background.png"), 1024, 1024),
  render(splashSvg(2732, 2732), path.join(assetsDir, "splash.png"), 2732, 2732),
  render(splashSvg(2732, 2732), path.join(assetsDir, "splash-dark.png"), 2732, 2732),
  render(iconSvg(512), path.join(playDir, "icon-512.png"), 512, 512),
  render(iconSvg(512), path.join(publicDir, "app-icon-512.png"), 512, 512),
  render(featureGraphicSvg(), path.join(playDir, "feature-graphic-1024x500.png"), 1024, 500),
  render(screenshotSvg("today"), path.join(playDir, "phone-01-hoje.png"), 1080, 1920),
  render(screenshotSvg("visit"), path.join(playDir, "phone-02-modo-visita.png"), 1080, 1920),
  render(screenshotSvg("register"), path.join(playDir, "phone-03-ocorrencia.png"), 1080, 1920),
  render(screenshotSvg("compliance"), path.join(playDir, "phone-04-compliance.png"), 1080, 1920),
  render(screenshotSvg("documents"), path.join(playDir, "phone-05-documentos-ia.png"), 1080, 1920),
  render(screenshotSvg("offline"), path.join(playDir, "phone-06-offline.png"), 1080, 1920),
]);

await fs.writeFile(
  path.join(playDir, "assets.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    brand: "SindCopilot",
    packageName: "com.sindcopilot.app",
    icon: "icon-512.png",
    featureGraphic: "feature-graphic-1024x500.png",
    phoneScreenshots: [
      "phone-01-hoje.png",
      "phone-02-modo-visita.png",
      "phone-03-ocorrencia.png",
      "phone-04-compliance.png",
      "phone-05-documentos-ia.png",
      "phone-06-offline.png"
    ]
  }, null, 2),
);

console.log("SindCopilot mobile and Google Play assets generated successfully.");
