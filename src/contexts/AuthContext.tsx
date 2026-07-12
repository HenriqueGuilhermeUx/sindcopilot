import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthUser = { id:string; email:string|null; name:string|null };
type AuthContextValue = { user:AuthUser|null; session:Session|null; loading:boolean; signOut:()=>Promise<void> };
const AuthContext=createContext<AuthContextValue|undefined>(undefined);

export function AuthProvider({children}:{children:React.ReactNode}){
  const[session,setSession]=useState<Session|null>(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});
    return()=>subscription.unsubscribe();
  },[]);
  const user=useMemo<AuthUser|null>(()=>session?.user?{id:session.user.id,email:session.user.email||null,name:(session.user.user_metadata?.name as string|undefined)||session.user.email?.split("@")[0]||null}:null,[session]);
  return <AuthContext.Provider value={{user,session,loading,signOut:async()=>{await supabase.auth.signOut()}}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error("useAuth precisa de AuthProvider");return ctx;}
