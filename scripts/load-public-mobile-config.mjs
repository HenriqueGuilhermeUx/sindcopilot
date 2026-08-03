import fs from "node:fs/promises";

const siteUrl = process.env.SINDCOPILOT_PUBLIC_URL || "https://sindcopilot.com";
const envFile = process.env.GITHUB_ENV;

function fail(message) {
  console.error(`[mobile-config] ${message}`);
  process.exit(1);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "SindCopilot-Android-Build/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}`);
  return response.text();
}

function absolute(base, resource) {
  return new URL(resource, base).toString();
}

try {
  if (!envFile) fail("GITHUB_ENV não está disponível.");

  const html = await fetchText(`${siteUrl.replace(/\/$/, "")}/`);
  const sources = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(match => match[1]);
  if (!sources.length) fail("Nenhum bundle JavaScript foi localizado no site em produção.");

  let publicBundle = html;
  for (const source of sources) {
    publicBundle += `\n${await fetchText(absolute(siteUrl, source))}`;
  }

  const supabaseUrl = publicBundle.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0];
  const jwtCandidates = [...publicBundle.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g)]
    .map(match => match[0])
    .filter(value => value.length > 100);
  const anonKey = jwtCandidates[0];

  if (!supabaseUrl || !anonKey) {
    fail(`Configuração pública incompleta: url=${Boolean(supabaseUrl)}, anon=${Boolean(anonKey)}.`);
  }

  await fs.appendFile(envFile, `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\n`);
  process.stdout.write(`::add-mask::${anonKey}\n`);
  console.log(`[mobile-config] Configuração pública carregada de ${siteUrl}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : "Falha ao carregar configuração pública.");
}
