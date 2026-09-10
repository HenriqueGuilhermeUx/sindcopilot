import { jsPDF } from "jspdf";
import type { OccurrenceDetail } from "@/lib/occurrences";

function fmt(value?: string | null, withTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...(withTime ? { timeStyle: "short" as const } : {}) }).format(date);
}

function safe(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function generateOccurrenceReport(detail: OccurrenceDetail) {
  const { occurrence, evidence, events, notices, previousOccurrences } = detail;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const width = pageWidth - margin * 2;
  let y = 18;

  const ensure = (height: number) => {
    if (y + height < pageHeight - 18) return;
    doc.addPage();
    y = 18;
  };
  const heading = (text: string) => {
    ensure(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(text.toUpperCase(), margin, y);
    y += 7;
  };
  const paragraph = (text?: string | null) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, width);
    ensure(lines.length * 4.2 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 4.2 + 5;
  };

  doc.setFillColor(15, 47, 73);
  doc.roundedRect(margin, y, width, 30, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(`SindCopilot • Dossiê da Ocorrência #${occurrence.id}`, margin + 7, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(occurrence.condominiumName, margin + 7, y + 20);
  y += 39;

  heading("Identificação do caso");
  paragraph(`Assunto: ${occurrence.title}\nCondomínio: ${occurrence.condominiumName}${occurrence.unitNumber ? `\nUnidade: ${occurrence.unitNumber}${occurrence.unitBlock ? ` - Bloco ${occurrence.unitBlock}` : ""}` : ""}\nData do fato: ${fmt(occurrence.happenedAt)}\nLocal: ${occurrence.location || "Não informado"}\nCategoria: ${occurrence.category}\nGravidade: ${occurrence.severity}\nStatus: ${occurrence.status}\nOrigem do registro: ${occurrence.reportedBy || occurrence.reportedChannel || "SindCopilot"}`);

  heading("Descrição registrada");
  paragraph(occurrence.description);

  heading("Regra vinculada");
  if (occurrence.ruleReference || occurrence.ruleExcerpt) {
    paragraph(`${occurrence.ruleReference || "Referência não informada"}${occurrence.rulePage ? ` — página ${occurrence.rulePage}` : ""}\n\n${occurrence.ruleExcerpt || ""}`);
  } else {
    paragraph("Nenhuma regra interna foi vinculada a esta ocorrência até a geração deste dossiê.");
  }

  heading(`Evidências (${evidence.length})`);
  if (!evidence.length) paragraph("Nenhuma evidência registrada.");
  evidence.forEach((item, index) => {
    paragraph(`${index + 1}. ${item.kind.toUpperCase()} — ${item.description || item.fileName || "Sem descrição"}${item.witnessName ? `\nTestemunha/relator: ${item.witnessName}` : ""}${item.capturedAt ? `\nData: ${fmt(item.capturedAt)}` : ""}${item.sha256 ? `\nSHA-256: ${item.sha256}` : ""}`);
  });

  heading("Linha do tempo");
  if (!events.length) paragraph("Sem eventos adicionais.");
  events.forEach(event => paragraph(`${fmt(event.createdAt)} — ${event.title}${event.description ? `\n${event.description}` : ""}`));

  heading(`Minutas e comunicações (${notices.length})`);
  if (!notices.length) paragraph("Nenhuma minuta vinculada ao caso.");
  notices.forEach(notice => {
    paragraph(`${notice.type.toUpperCase()} — ${notice.subject}\nStatus: ${notice.status}${notice.sentAt ? ` — registrada como enviada em ${fmt(notice.sentAt)}` : ""}${notice.legalBasis ? `\nBase indicada: ${notice.legalBasis}` : ""}${notice.warning ? `\nAtenção: ${notice.warning}` : ""}`);
  });

  heading("Histórico semelhante da unidade");
  if (!previousOccurrences.length) paragraph("Não há outra ocorrência registrada da mesma categoria para esta unidade.");
  previousOccurrences.forEach(previous => paragraph(`#${previous.id} — ${fmt(previous.happenedAt, false)} — ${previous.title} — status: ${previous.status}${previous.resolution ? `\nDesfecho: ${previous.resolution}` : ""}`));

  if (occurrence.resolution) {
    heading("Desfecho");
    paragraph(occurrence.resolution);
  }

  ensure(22);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  const footer = doc.splitTextToSize("Documento operacional gerado pelo SindCopilot a partir dos registros existentes no sistema. O dossiê não substitui análise jurídica, contábil ou técnica e deve ser revisado pelo responsável pela gestão.", width);
  doc.text(footer, margin, y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  doc.save(`ocorrencia-${occurrence.id}-${safe(occurrence.condominiumName)}.pdf`);
}
