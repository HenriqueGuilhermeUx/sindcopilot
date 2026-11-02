import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CalendarCheck, CheckCircle, Clock, FileCheck2, Play, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: Record<string,string>={avcb:"AVCB (Bombeiros)",seguro:"Seguro Obrigatório",dedetizacao:"Dedetização",caixa_dagua:"Limpeza Caixa d'Água",para_raios:"Para-raios",elevador:"Manutenção Elevador",extintores:"Extintores",laudo_eletrico:"Laudo Elétrico",laudo_estrutural:"Laudo Estrutural",outro:"Outro"};

function statusInfo(item:any){
  if(item.status==="completed")return{label:"Concluído",tone:"bg-emerald-100 text-emerald-700",icon:CheckCircle};
  const days=Math.ceil((new Date(item.dueDate).getTime()-Date.now())/86400000);
  if(days<0)return{label:`${Math.abs(days)}d atrasado`,tone:"bg-rose-100 text-rose-700",icon:AlertTriangle};
  if(item.startedAt)return{label:`Em andamento · ${days}d`,tone:"bg-blue-100 text-blue-700",icon:Play};
  if(days<=30)return{label:`${days}d restantes`,tone:"bg-amber-100 text-amber-800",icon:Clock};
  return{label:`${days}d restantes`,tone:"bg-muted text-muted-foreground",icon:Clock};
}

export default function Compliance(){
  const [open,setOpen]=useState(false);
  const [workflow,setWorkflow]=useState<any>(null);
  const [selectedCondo,setSelectedCondo]=useState("");
  const [category,setCategory]=useState("avcb");
  const [isRecurring,setIsRecurring]=useState(false);
  const [filter,setFilter]=useState("open");
  const utils=trpc.useUtils();
  const {data:condos}=trpc.condominium.list.useQuery();
  const {data:docs}=trpc.document.listAll.useQuery();
  const {data:allObligations,isLoading}=trpc.obligation.listAll.useQuery();

  const refresh=()=>Promise.all([utils.obligation.listAll.invalidate(),utils.obligation.upcoming.invalidate(),utils.dashboard.stats.invalidate()]);
  const createMutation=trpc.obligation.create.useMutation({onSuccess:async()=>{await refresh();setOpen(false);toast.success("Obrigação cadastrada e incluída no workflow.")},onError:e=>toast.error(e.message)});
  const updateMutation=trpc.obligation.update.useMutation({onSuccess:async()=>{await refresh();setWorkflow(null);toast.success("Workflow atualizado.")},onError:e=>toast.error(e.message)});
  const deleteMutation=trpc.obligation.delete.useMutation({onSuccess:async()=>{await refresh();toast.success("Obrigação removida.")}});

  const obligations=useMemo(()=>((allObligations as any[])||[]).filter(item=>{
    if(filter==="all")return true;
    if(filter==="completed")return item.obligation.status==="completed";
    if(filter==="overdue")return item.obligation.status!=="completed"&&new Date(item.obligation.dueDate).getTime()<Date.now();
    return item.obligation.status!=="completed";
  }),[allObligations,filter]);

  const metrics=useMemo(()=>{
    const rows=((allObligations as any[])||[]).map(x=>x.obligation);
    return{open:rows.filter(x=>x.status!=="completed").length,overdue:rows.filter(x=>x.status!=="completed"&&new Date(x.dueDate).getTime()<Date.now()).length,completed:rows.filter(x=>x.status==="completed").length,evidence:rows.filter(x=>!!x.evidenceDocumentId).length};
  },[allObligations]);

  const docsFor=(condominiumId:number)=>((docs as any[])||[]).filter(d=>Number(d.condominiumId)===Number(condominiumId));

  const handleCreate=(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    createMutation.mutate({
      condominiumId:Number(selectedCondo),title:String(fd.get("title")||""),description:String(fd.get("description")||"")||undefined,
      category:category as any,dueDate:new Date(String(fd.get("dueDate"))),alertDaysBefore:Number(fd.get("alertDays")||30),
      isRecurring,recurringMonths:isRecurring?Number(fd.get("recurringMonths")||12):undefined,
      responsibleName:String(fd.get("responsibleName")||"")||undefined,
      evidenceDocumentId:fd.get("evidenceDocumentId")?Number(fd.get("evidenceDocumentId")):undefined,
      notes:String(fd.get("notes")||"")||undefined,
    });
  };

  const saveWorkflow=(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(!workflow)return;const fd=new FormData(e.currentTarget);
    updateMutation.mutate({id:workflow.obligation.id,responsibleName:String(fd.get("responsibleName")||"")||null,evidenceDocumentId:fd.get("evidenceDocumentId")?Number(fd.get("evidenceDocumentId")):null,notes:String(fd.get("notes")||"")||undefined});
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Compliance 360</h1><p className="text-sm text-muted-foreground">Obrigação → responsável → evidência → conclusão → recorrência, com visão de toda a carteira.</p></div>
      <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Nova obrigação</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Nova obrigação</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={handleCreate}>
          <div><Label>Condomínio *</Label><Select value={selectedCondo} onValueChange={setSelectedCondo}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{(condos as any[]|undefined)?.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Título *</Label><Input name="title" required placeholder="Ex.: Renovação AVCB"/></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Categoria</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(CATEGORIES).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div><Label>Vencimento</Label><Input name="dueDate" type="date" required/></div></div>
          <div><Label>Responsável</Label><Input name="responsibleName" placeholder="Pessoa, administradora ou fornecedor"/></div>
          <div><Label>Evidência / documento</Label><Select name="evidenceDocumentId"><SelectTrigger><SelectValue placeholder="Vincular documento (opcional)"/></SelectTrigger><SelectContent>{docsFor(Number(selectedCondo)).map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Alertar antes (dias)</Label><Input name="alertDays" type="number" defaultValue="30"/></div><div className="flex items-end gap-2 pb-2"><Switch checked={isRecurring} onCheckedChange={setIsRecurring}/><Label>Recorrente</Label></div></div>
          {isRecurring&&<div><Label>Repetir a cada (meses)</Label><Input name="recurringMonths" type="number" defaultValue="12"/></div>}
          <div><Label>Descrição</Label><Textarea name="description"/></div><div><Label>Observações</Label><Textarea name="notes"/></div>
          <Button className="w-full" disabled={!selectedCondo||createMutation.isPending}>Cadastrar</Button>
        </form>
      </DialogContent></Dialog>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ["Em aberto",metrics.open,Clock],["Atrasadas",metrics.overdue,AlertTriangle],["Concluídas",metrics.completed,CheckCircle],["Com evidência",metrics.evidence,FileCheck2]
    ].map(([label,value,Icon]:any)=><Card key={label}><CardContent className="p-4"><Icon className="h-5 w-5 text-cyan-700"/><p className="mt-2 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    <div className="flex flex-wrap gap-2">{["open","overdue","completed","all"].map(v=><Button key={v} size="sm" variant={filter===v?"default":"outline"} onClick={()=>setFilter(v)}>{v==="open"?"Em aberto":v==="overdue"?"Atrasadas":v==="completed"?"Concluídas":"Todas"}</Button>)}</div>

    {isLoading?<div className="py-16 text-center text-muted-foreground">Carregando…</div>:!obligations.length?<div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground"><CalendarCheck className="mx-auto mb-3 h-12 w-12 opacity-30"/><p>Nenhuma obrigação neste filtro.</p></div>:<div className="grid gap-3">{obligations.map((item:any)=>{const info=statusInfo(item.obligation);const Icon=info.icon;return <Card key={item.obligation.id}><CardContent className="p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${info.tone}`}><Icon className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.obligation.title}</p><Badge variant="outline">{CATEGORIES[item.obligation.category]||item.obligation.category}</Badge>{item.obligation.isRecurring&&<Badge variant="secondary">Recorrente</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.condominiumName} · vence {new Date(item.obligation.dueDate).toLocaleDateString("pt-BR")}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">{item.obligation.responsibleName&&<span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5"/>{item.obligation.responsibleName}</span>}{item.obligation.evidenceDocumentId&&<span className="flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5"/>Evidência vinculada</span>}</div></div><div className="flex flex-wrap items-center gap-2"><Badge className={info.tone}>{info.label}</Badge>{item.obligation.status!=="completed"&&!item.obligation.startedAt&&<Button size="sm" variant="outline" onClick={()=>updateMutation.mutate({id:item.obligation.id,startedAt:new Date()})}><Play className="mr-1 h-3.5 w-3.5"/>Iniciar</Button>}<Button size="sm" variant="outline" onClick={()=>setWorkflow(item)}>Workflow</Button>{item.obligation.status!=="completed"&&<Button size="sm" onClick={()=>updateMutation.mutate({id:item.obligation.id,status:"completed"})}><CheckCircle className="mr-1 h-3.5 w-3.5"/>Concluir</Button>}<Button size="icon" variant="ghost" className="text-destructive" onClick={()=>deleteMutation.mutate({id:item.obligation.id})}><Trash2 className="h-4 w-4"/></Button></div></div></CardContent></Card>})}</div>}

    <Dialog open={!!workflow} onOpenChange={v=>{if(!v)setWorkflow(null)}}><DialogContent><DialogHeader><DialogTitle>Workflow de compliance</DialogTitle></DialogHeader>{workflow&&<form className="space-y-4" onSubmit={saveWorkflow}><div><Label>Responsável</Label><Input name="responsibleName" defaultValue={workflow.obligation.responsibleName||""}/></div><div><Label>Evidência documental</Label><Select name="evidenceDocumentId" defaultValue={workflow.obligation.evidenceDocumentId?String(workflow.obligation.evidenceDocumentId):undefined}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{docsFor(workflow.obligation.condominiumId).map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}</SelectContent></Select></div><div><Label>Observações</Label><Textarea name="notes" defaultValue={workflow.obligation.notes||""}/></div><Button className="w-full">Salvar workflow</Button></form>}</DialogContent></Dialog>
  </div>;
}
