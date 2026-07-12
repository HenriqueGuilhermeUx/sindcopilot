import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserPlus, Mail, Phone, Loader2, Trash2, ShieldOff, Crown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Ajudantes() {
  const { user } = useAuth();
  const assistants = trpc.assistant.list.useQuery(undefined, { enabled: !!user });
  const billingStatus = trpc.billing.status.useQuery(undefined, { enabled: !!user });
  const inviteMutation = trpc.assistant.invite.useMutation();
  const revokeMutation = trpc.assistant.revoke.useMutation();
  const deleteMutation = trpc.assistant.delete.useMutation();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "" });
  const maxAssistants = billingStatus.data?.maxAssistants || 0;
  const activeAssistants = assistants.data?.filter((a: any) => a.status !== "revoked") || [];
  const handleInvite = async () => {
    if (!form.email) return toast.error("Email e obrigatorio");
    try {
      const result = await inviteMutation.mutateAsync({ ...form, role: "assistant" });
      utils.assistant.list.invalidate(); setForm({ email: "", name: "", phone: "" }); setOpen(false);
      try { await navigator.clipboard.writeText(result.inviteUrl); toast.success("Convite criado e link copiado. Envie-o ao ajudante."); }
      catch { toast.success(`Convite criado: ${result.inviteUrl}`); }
    } catch (error: any) { toast.error(error.message || "Erro ao enviar convite"); }
  };
  const handleRevoke = async (id:number)=>{try{await revokeMutation.mutateAsync({id});utils.assistant.list.invalidate();toast.success("Acesso revogado")}catch(error:any){toast.error(error.message||"Erro ao revogar acesso")}};
  const handleDelete = async (id:number)=>{try{await deleteMutation.mutateAsync({id});utils.assistant.list.invalidate();toast.success("Ajudante removido")}catch(error:any){toast.error(error.message||"Erro ao remover ajudante")}};
  const statusColors:Record<string,string>={pending:"bg-amber-100 text-amber-700",active:"bg-emerald-100 text-emerald-700",revoked:"bg-red-100 text-red-700"};
  const statusLabels:Record<string,string>={pending:"Pendente",active:"Ativo",revoked:"Revogado"};
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Ajudantes</h1><p className="text-slate-600">Gerencie quem tem acesso a sua conta.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button disabled={activeAssistants.length>=maxAssistants}><UserPlus className="h-4 w-4 mr-2"/>Convidar Ajudante</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Convidar Ajudante</DialogTitle><DialogDescription>O ajudante poderá visualizar e gerenciar os condomínios da sua conta. O link de convite será copiado para você compartilhar.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="invite-email">Email *</Label><Input id="invite-email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></div><div className="space-y-2"><Label htmlFor="invite-name">Nome</Label><Input id="invite-name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome do ajudante"/></div><div className="space-y-2"><Label htmlFor="invite-phone">Telefone</Label><Input id="invite-phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(11) 99999-9999"/></div></div><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button onClick={handleInvite} disabled={inviteMutation.isPending}>{inviteMutation.isPending?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:<UserPlus className="h-4 w-4 mr-2"/>}Criar Convite</Button></DialogFooter></DialogContent></Dialog></div>
    <Card><CardContent className="py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-slate-500"/><span className="text-slate-600">{activeAssistants.length} de {maxAssistants} ajudantes utilizados</span></div>{maxAssistants===0&&<Button variant="outline" size="sm" asChild><a href="/planos"><Crown className="h-3 w-3 mr-1"/>Fazer Upgrade</a></Button>}</div><div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{width:`${maxAssistants>0?(activeAssistants.length/maxAssistants)*100:0}%`}}/></div></CardContent></Card>
    {!assistants.data?.length?<Card><CardContent className="py-12 text-center"><Users className="h-12 w-12 text-slate-300 mx-auto mb-4"/><h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum ajudante cadastrado</h3><p className="text-slate-600 text-sm mb-4">{maxAssistants>0?"Convide ajudantes para te auxiliar na gestao dos condominios.":"Faca upgrade do seu plano para adicionar ajudantes."}</p></CardContent></Card>:<div className="space-y-3">{assistants.data.map((assistant:any)=><Card key={assistant.id}><CardContent className="py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Users className="h-5 w-5"/></div><div><p className="font-medium text-slate-900">{assistant.name||"Sem nome"}</p><div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{assistant.email}</span>{assistant.phone&&<span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{assistant.phone}</span>}</div></div></div><div className="flex items-center gap-2"><Badge className={statusColors[assistant.status]}>{statusLabels[assistant.status]}</Badge>{assistant.status!=="revoked"&&<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600"><ShieldOff className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Revogar acesso?</AlertDialogTitle><AlertDialogDescription>{assistant.name||assistant.email} perdera o acesso a sua conta.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleRevoke(assistant.id)}>Revogar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover ajudante?</AlertDialogTitle><AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDelete(assistant.id)} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></CardContent></Card>)}</div>}
  </div>;
}
