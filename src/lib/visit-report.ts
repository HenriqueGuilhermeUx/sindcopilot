import { jsPDF } from "jspdf";
import type { VisitItemStatus } from "@/lib/field-visits";

export type VisitReportInput = {
  id?: number;
  condominiumName: string;
  condominiumAddress?: string | null;
  startedAt: string;
  completedAt?: string | null;
  summary?: string | null;
  items: Array<{
    area: string;
    title: string;
    status: VisitItemStatus;
    notes?: string | null;
    dueDate?: string | null;
    documentId?: number | null;
  }>;
};

const STATUS_LABEL: Record<VisitItemStatus, string> = {
  pending: "Não verificado",
  ok: "Conforme",
  attention: "Atenção",
  urgent: "Urgente",
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function generateVisitReport(visit: VisitReportInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const counts = {
    ok: visit.items.filter(item => item.status === "ok").length,
    attention: visit.items.filter(item => item.status === "attention").length,
    urgent: visit.items.filter(item => item.status === "urgent").length,
    pending: visit.items.filter(item => item.status === "pending").length,
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    doc.addPage();
    y = 18;
  };

  doc.setFillColor(15, 47, 73);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SindCopilot • Relatório de Visita", margin + 7, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(visit.condominiumName, margin + 7, y + 19);
  y += 36;

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÕES", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Visita: ${visit.id ? `#${visit.id}` : "rascunho local"}`, margin, y);
  doc.text(`Início: ${formatDate(visit.startedAt, true)}`, margin + 75, y);
  y += 5;
  doc.text(`Conclusão: ${formatDate(visit.completedAt || new Date().toISOString(), true)}`, margin, y);
  if (visit.condominiumAddress) doc.text(`Local: ${visit.condominiumAddress}`, margin + 75, y);
  y += 10;

  const cards = [
    ["Conforme", counts.ok],
    ["Atenção", counts.attention],
    ["Urgente", counts.urgent],
    ["Pendente", counts.pending],
  ] as const;
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  cards.forEach(([label, count], index) => {
    const x = margin + index * (cardWidth + cardGap);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(String(count), x + 4, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label, x + 4, y + 14);
  });
  y += 26;

  if (visit.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RESUMO DA VISITA", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(visit.summary, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4.5 + 7;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CHECKLIST E OCORRÊNCIAS", margin, y);
  y += 7;

  visit.items.forEach((item, index) => {
    const noteLines = item.notes ? doc.splitTextToSize(item.notes, contentWidth - 10) : [];
    const estimatedHeight = 18 + noteLines.length * 4.2 + (item.dueDate ? 5 : 0);
    ensureSpace(estimatedHeight);

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(item.status === "urgent" ? 254 : item.status === "attention" ? 255 : 248, item.status === "urgent" ? 242 : item.status === "attention" ? 251 : 250, item.status === "urgent" ? 242 : item.status === "attention" ? 235 : 252);
    doc.roundedRect(margin, y, contentWidth, estimatedHeight - 3, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${item.area} — ${item.title}`, margin + 4, y + 6);

    doc.setFontSize(8);
    doc.text(STATUS_LABEL[item.status].toUpperCase(), pageWidth - margin - 4, y + 6, { align: "right" });

    let itemY = y + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (noteLines.length) {
      doc.text(noteLines, margin + 4, itemY);
      itemY += noteLines.length * 4.2;
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text("Sem observações.", margin + 4, itemY);
      itemY += 4.2;
    }

    doc.setTextColor(71, 85, 105);
    if (item.dueDate) doc.text(`Prazo: ${formatDate(`${item.dueDate}T12:00:00`)}`, margin + 4, itemY);
    if (item.documentId) doc.text("Foto registrada no SindCopilot", pageWidth - margin - 4, itemY, { align: "right" });
    y += estimatedHeight + 2;
  });

  ensureSpace(20);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Relatório gerado pelo SindCopilot. Ocorrências e prazos devem ser revisados pelo responsável pela gestão.", margin, y);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const date = new Date(visit.completedAt || Date.now()).toISOString().slice(0, 10);
  doc.save(`visita-${safeFilename(visit.condominiumName)}-${date}.pdf`);
}
