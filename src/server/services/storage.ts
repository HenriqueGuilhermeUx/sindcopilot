import { nanoid } from "nanoid";
import { ENV } from "../core/env";
import { supabaseAdmin } from "../core/supabase";
import { badRequest, serviceUnavailable } from "../core/errors";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 20 * 1024 * 1024;

export function validateUpload(fileName: string, mimeType: string, buffer: Buffer) {
  if (!ALLOWED.has(mimeType)) throw badRequest("Formato não permitido. Envie PDF, JPG, PNG ou WebP.");
  if (!buffer.length) throw badRequest("Arquivo vazio");
  if (buffer.length > MAX_BYTES) throw badRequest("Arquivo maior que 20 MB");
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160) || "documento";
  return safe;
}

export async function putDocument(ownerId: string, condominiumId: number, fileName: string, mimeType: string, buffer: Buffer) {
  const safe = validateUpload(fileName, mimeType, buffer);
  const key = `${ownerId}/${condominiumId}/${Date.now()}-${nanoid(10)}-${safe}`;
  const { error } = await supabaseAdmin.storage.from(ENV.SUPABASE_STORAGE_BUCKET).upload(key, buffer, { contentType: mimeType, upsert: false, cacheControl: "3600" });
  if (error) throw serviceUnavailable(`Falha ao armazenar o arquivo: ${error.message}`);
  return { key, sizeBytes: buffer.length, fileName: safe };
}

export async function signedUrl(key: string, expiresIn = 900) {
  const { data, error } = await supabaseAdmin.storage.from(ENV.SUPABASE_STORAGE_BUCKET).createSignedUrl(key, expiresIn);
  if (error || !data?.signedUrl) throw serviceUnavailable("Não foi possível abrir o arquivo");
  return data.signedUrl;
}

export async function downloadDocument(key: string) {
  const { data, error } = await supabaseAdmin.storage.from(ENV.SUPABASE_STORAGE_BUCKET).download(key);
  if (error || !data) throw serviceUnavailable(`Falha ao ler o arquivo: ${error?.message || "arquivo indisponível"}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function removeDocument(key: string) {
  const { error } = await supabaseAdmin.storage.from(ENV.SUPABASE_STORAGE_BUCKET).remove([key]);
  if (error) console.error("[Storage delete]", error);
}
