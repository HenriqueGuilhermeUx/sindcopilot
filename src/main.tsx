import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthProvider } from "@/contexts/AuthContext";
import { apiUrl, applyNativeDocumentClass, installNativeFetchBridge, isNativeApp } from "@/lib/runtime";
import App from "@/App";
import "@/index.css";

applyNativeDocumentClass();
installNativeFetchBridge();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 0 } },
});

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: apiUrl("/api/trpc"),
      transformer: superjson,
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token
          ? { authorization: `Bearer ${data.session.access_token}` }
          : {};
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider><App /></AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD && !isNativeApp) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("[PWA] Falha ao registrar service worker", error);
    });
  });
}
