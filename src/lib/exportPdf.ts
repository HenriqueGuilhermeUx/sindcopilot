import jsPDF from "jspdf";

interface PdfOptions {
  title: string;
  subtitle?: string;
  data: Record<string, string | number | null | undefined>[];
  columns: { key: string; label: string; width?: number }[];
  fileName?: string;
}

export function exportToPdf({ title, subtitle, data, columns, fileName }: PdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("SindCopilot", margin, y); y += 8;
  doc.setFontSize(14); doc.text(title, margin, y); y += 6;
  if (subtitle) { doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100); doc.text(subtitle, margin, y); y += 4; }
  doc.setFontSize(8); doc.setTextColor(150); doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} as ${new Date().toLocaleTimeString("pt-BR")}`, margin, y); y += 8;
  doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 6;

  const defaultColWidth = contentWidth / columns.length; const colWidths = columns.map(c => c.width || defaultColWidth);
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(50); doc.setFillColor(245,245,245); doc.rect(margin,y-4,contentWidth,8,"F");
  let x=margin; columns.forEach((col,i)=>{doc.text(col.label,x+2,y);x+=colWidths[i]}); y+=8;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60);
  data.forEach((row,rowIdx)=>{if(y>270){doc.addPage();y=20}if(rowIdx%2===0){doc.setFillColor(250,250,250);doc.rect(margin,y-4,contentWidth,7,"F")}x=margin;columns.forEach((col,i)=>{const val=String(row[col.key]??"-");doc.text(val.length>40?val.substring(0,37)+"...":val,x+2,y);x+=colWidths[i]});y+=7});
  y+=10;doc.setFontSize(7);doc.setTextColor(180);doc.text("Documento gerado automaticamente pelo SindCopilot",margin,y);
  doc.save(fileName || `${title.toLowerCase().replace(/\s+/g,"-")}-${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportCondominiumReport(condo:any,units:any[],obligations:any[]){
 const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});const pageWidth=doc.internal.pageSize.getWidth();const margin=15;let y=20;
 doc.setFontSize(18);doc.setFont("helvetica","bold");doc.text("SindCopilot",margin,y);y+=8;doc.setFontSize(14);doc.text(`Relatorio - ${condo.name}`,margin,y);y+=6;doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(150);doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,margin,y);y+=10;
 doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(30);doc.text("Dados do Condominio",margin,y);y+=7;doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(60);
 const info=[["CNPJ",condo.cnpj||"-"],["Endereco",condo.address||"-"],["Cidade/UF",`${condo.city||"-"} / ${condo.state||"-"}`],["CEP",condo.zipCode||"-"],["Telefone",condo.phone||"-"],["Email",condo.email||"-"],["Status",condo.status==="active"?"Ativo":"Inativo"]];
 info.forEach(([label,value])=>{doc.setFont("helvetica","bold");doc.text(`${label}: `,margin,y);doc.setFont("helvetica","normal");doc.text(String(value),margin+30,y);y+=5});y+=8;
 doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(30);doc.text(`Unidades (${units.length})`,margin,y);y+=7;
 if(units.length){doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setFillColor(245,245,245);doc.rect(margin,y-4,pageWidth-margin*2,7,"F");doc.setTextColor(50);doc.text("Unidade",margin+2,y);doc.text("Bloco",margin+25,y);doc.text("Proprietario",margin+45,y);doc.text("Morador",margin+100,y);y+=7;doc.setFont("helvetica","normal");doc.setTextColor(60);units.forEach((unit,i)=>{if(y>270){doc.addPage();y=20}if(i%2===0){doc.setFillColor(250,250,250);doc.rect(margin,y-4,pageWidth-margin*2,6,"F")}doc.text(unit.number||"-",margin+2,y);doc.text(unit.block||"-",margin+25,y);doc.text((unit.ownerName||"-").substring(0,25),margin+45,y);doc.text((unit.residentName||"-").substring(0,25),margin+100,y);y+=6})}
 y+=8;if(y>240){doc.addPage();y=20}doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(30);doc.text(`Obrigacoes de Compliance (${obligations.length})`,margin,y);y+=7;
 if(obligations.length){doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setFillColor(245,245,245);doc.rect(margin,y-4,pageWidth-margin*2,7,"F");doc.setTextColor(50);doc.text("Obrigacao",margin+2,y);doc.text("Categoria",margin+60,y);doc.text("Vencimento",margin+110,y);doc.text("Status",margin+145,y);y+=7;doc.setFont("helvetica","normal");doc.setTextColor(60);obligations.forEach((ob,i)=>{if(y>270){doc.addPage();y=20}if(i%2===0){doc.setFillColor(250,250,250);doc.rect(margin,y-4,pageWidth-margin*2,6,"F")}doc.text((ob.title||"-").substring(0,30),margin+2,y);doc.text(ob.category||"-",margin+60,y);doc.text(ob.dueDate?new Date(ob.dueDate).toLocaleDateString("pt-BR"):"-",margin+110,y);doc.text(ob.status||"-",margin+145,y);y+=6})}
 y+=10;doc.setFontSize(7);doc.setTextColor(180);doc.text("Documento gerado automaticamente pelo SindCopilot",margin,y);doc.save(`relatorio-${condo.name?.toLowerCase().replace(/\s+/g,"-")||"condominio"}-${new Date().toISOString().split("T")[0]}.pdf`);
}
