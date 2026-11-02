import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Bell, CalendarCheck, ClipboardCheck, Download, FileText, History, ShieldCheck } from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";

const KIND: Record<string,{label:string;icon:any}> = {
  document:{label:"Documento",icon:FileText},
  occurrence:{label:"Ocorrência",icon:ShieldCheck},
  notice:{label:"Comunicação",icon:Bell},
  obligation:{label:"Compliance",icon:CalendarCheck},
  visit:{label:"Visita",icon:ClipboardCheck},
  activity:{label:"Atividade",icon:Activity},
};

export default function Historico360(){
  const {data:condos}=trpc.condominium.list.useQuery();
  const [condominiumId,setCondominiumId]=useState(0);
  const [kind,setKind]=useState("all");
  useEffect(()=>{if(!condominiumId&&condos?.length)setCondominiumId(Number((condos as any[])[0].id));},[condos,condominiumId]);
  const {data:timeline,isLoading}=trpc.document.timeline.useQuery({condominiumId},{enabled:!!condominiumId});
  const condo=(condos as any[]|undefined)?.find(c=>Number(c.id)===condominiumId);
  const items=useMemo(()=>((timeline as any[])||[]).filter(item=>kind==="all"||item.kind===kind),[timeline,kind]);
  const exportPdf=()=>exportToPdf({
    title:"Histórico Visual 360",
    subtitle:condo?.name||"Condomínio",
    data:items.map((item:any)=>({data:new Date(item.date).toLocaleDateString("pt-BR"),tipo:KIND[item.kind]?.label||item.kind,titulo:item.title,status:item.status||"—"})),
    columns:[{key:"data",label:"Data",width:25},{key:"tipo",label:"Tipo",width:28},{key:"titulo",label:"Evento",width:85},{key:"status",label:"Status",width:30}],
    fileName:`historico-360-${condo?.name||"condominio"}.pdf`,
  });
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><History className="h-6 w-6 text-cyan-700"/>Histórico Visual 360</h1><p className="text-sm text-muted-foreground">Linha do tempo real de documentos, vistorias, ocorrências, comunicações, compliance e atividades do condomínio.</p></div>
      <div className="flex flex-wrap gap-2"><Select value={condominiumId?String(condominiumId):""} onValueChange={v=>setCondominiumId(Number(v))}><SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione o condomínio"/></SelectTrigger><SelectContent>{(condos as any[]|undefined)?.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={!items.length} onClick={exportPdf}><Download className="mr-2 h-4 w-4"/>PDF</Button></div>
    </div>
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Filtrar eventos</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{["all","document","visit","occurrence","notice","obligation","activity"].map(value=><Button key={value} size="sm" variant={kind===value?"default":"outline"} onClick={()=>setKind(value)}>{value==="all"?"Tudo":KIND[value]?.label}</Button>)}</CardContent></Card>
    {isLoading?<div className="py-16 text-center text-muted-foreground">Carregando histórico…</div>:!items.length?<div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground"><History className="mx-auto mb-3 h-12 w-12 opacity-30"/><p>Nenhum evento encontrado neste filtro.</p></div>:<div className="relative ml-3 border-l pl-6">{items.map((item:any)=>{const meta=KIND[item.kind]||{label:item.kind,icon:Activity};const Icon=meta.icon;return <div key={item.id} className="relative mb-4"><div className="absolute -left-[38px] top-4 grid h-6 w-6 place-items-center rounded-full border bg-background"><Icon className="h-3.5 w-3.5"/></div><Card><CardContent className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{meta.label}</Badge>{item.status&&<Badge variant="secondary">{item.status}</Badge>}</div><p className="mt-2 font-medium">{item.title}</p>{item.subtitle&&<p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>}{item.description&&<p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}</div><time className="text-xs text-muted-foreground">{new Date(item.date).toLocaleString("pt-BR")}</time></div></CardContent></Card></div>})}</div>}
  </div>;
}
