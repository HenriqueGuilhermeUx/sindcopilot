import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, CalendarCheck, Crown, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Sun, User, Users, UserPlus, Bell, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const items=[
  [LayoutDashboard,"Dashboard","/dashboard"],[Building2,"Condomínios","/condominios"],[FileText,"Documentos","/documentos"],[CalendarCheck,"Compliance","/compliance"],[Bell,"Notificações","/notificacoes"],[Users,"Fornecedores","/fornecedores"],[UserPlus,"Ajudantes","/ajudantes"],
] as const;
const lower=[[MessageSquare,"Assistente IA","/assistente"],[Crown,"Planos","/planos"],[User,"Meu Perfil","/perfil"]] as const;

export default function DashboardLayout({children}:{children:React.ReactNode}){
  const{user,loading,signOut}=useAuth();const[location,setLocation]=useLocation();const[open,setOpen]=useState(false);const{theme,toggleTheme}=useTheme();
  if(loading)return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if(!user){setTimeout(()=>setLocation(`/login?redirect=${encodeURIComponent(location)}`),0);return null;}
  const nav=(path:string)=>{setLocation(path);setOpen(false)};
  const Sidebar=()=> <aside className="flex h-full w-72 flex-col bg-slate-950 text-slate-100">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/15"><Building2 className="h-5 w-5 text-cyan-300"/></div><div><p className="font-bold">SindCopilot</p><p className="text-xs text-slate-400">Centro de comando</p></div><button className="ml-auto lg:hidden" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items.map(([Icon,label,path])=><button key={path} onClick={()=>nav(path)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",location===path||location.startsWith(path+"/")?"bg-cyan-500/15 text-cyan-200":"text-slate-300 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4"/>{label}</button>)}<div className="my-3 border-t border-white/10"/>{lower.map(([Icon,label,path])=><button key={path} onClick={()=>nav(path)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",location===path?"bg-cyan-500/15 text-cyan-200":"text-slate-300 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4"/>{label}</button>)}</nav>
    <div className="border-t border-white/10 p-4 text-xs text-slate-400">Seus dados permanecem separados por conta e condomínio.</div>
  </aside>;
  return <div className="min-h-screen bg-slate-50 dark:bg-background">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block"><Sidebar/></div>
    {open&&<div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/60" onClick={()=>setOpen(false)}/><div className="relative h-full w-72"><Sidebar/></div></div>}
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur sm:px-6"><Button variant="ghost" size="icon" className="lg:hidden" onClick={()=>setOpen(true)}><Menu className="h-5 w-5"/></Button><div className="ml-auto flex items-center gap-2"><Button variant="ghost" size="icon" onClick={toggleTheme}>{theme==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</Button><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted"><Avatar className="h-9 w-9"><AvatarFallback>{(user.name||user.email||"U").slice(0,2).toUpperCase()}</AvatarFallback></Avatar><span className="hidden text-left text-sm sm:block"><span className="block font-medium">{user.name||"Síndico"}</span><span className="block max-w-44 truncate text-xs text-muted-foreground">{user.email}</span></span></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>nav("/perfil")}><User className="mr-2 h-4 w-4"/>Meu perfil</DropdownMenuItem><DropdownMenuItem onSelect={async()=>{await signOut();setLocation("/")}}><LogOut className="mr-2 h-4 w-4"/>Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
