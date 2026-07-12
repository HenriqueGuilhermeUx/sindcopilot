import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "@/App";
import "@/index.css";

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1},mutations:{retry:0}}});
const trpcClient=trpc.createClient({links:[httpLink({url:"/api/trpc",transformer:superjson,headers:async()=>{const{data}=await supabase.auth.getSession();return data.session?.access_token?{authorization:`Bearer ${data.session.access_token}`}:{}}})]});
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><AuthProvider><App/></AuthProvider></QueryClientProvider></trpc.Provider></React.StrictMode>);
