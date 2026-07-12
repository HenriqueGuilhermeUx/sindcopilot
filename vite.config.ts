import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) return "pdf-vendor";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (id.includes("@trpc") || id.includes("@tanstack") || id.includes("superjson")) return "data-vendor";
            if (id.includes("@radix-ui")) return "radix-vendor";
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: env.DEV_API_URL || "http://localhost:3000", changeOrigin: true },
      },
    },
  };
});
