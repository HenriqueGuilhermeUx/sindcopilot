import { supabase } from "@/lib/supabase";

export type VisitItemStatus = "pending" | "ok" | "attention" | "urgent";

export type CondoOption = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
};

export type VisitDraftItem = {
  clientId: string;
  area: string;
  title: string;
  status: VisitItemStatus;
  notes: string;
  dueDate: string | null;
  photoId: string | null;
  photoName: string | null;
  photoType: string | null;
  isCustom?: boolean;
};

export type VisitDraft = {
  localId: string;
  condominiumId: number;
  condominiumName: string;
  condominiumAddress?: string | null;
  startedAt: string;
  summary: string;
  items: VisitDraftItem[];
};

export type RecentVisit = {
  id: number;
  condominiumId: number;
  condominiumName: string;
  startedAt: string;
  completedAt: string;
  summary: string | null;
  totalItems: number;
  okCount: number;
  attentionCount: number;
  urgentCount: number;
  pendingCount: number;
};

export type VisitDetail = RecentVisit & {
  items: Array<{
    id: number;
    clientId: string;
    area: string;
    title: string;
    status: VisitItemStatus;
    notes: string | null;
    dueDate: string | null;
    documentId: number | null;
  }>;
};

const DRAFT_KEY = "sindcopilot.field-visit-draft.v1";
const CONDOS_KEY = "sindcopilot.cached-condominiums.v1";
const DB_NAME = "sindcopilot-field";
const DB_VERSION = 1;
const PHOTO_STORE = "visit-photos";

const DEFAULT_CHECKLIST: Array<[string, string]> = [
  ["Acesso", "Portaria, interfones, portões e controle de acesso"],
  ["Segurança", "Extintores, sinalização e rotas de fuga"],
  ["Garagem", "Iluminação, piso, portões e circulação"],
  ["Elevadores", "Funcionamento, limpeza e avisos obrigatórios"],
  ["Equipamentos", "Bombas, gerador e casa de máquinas"],
  ["Áreas comuns", "Salão, academia, playground e mobiliário"],
  ["Limpeza", "Lixeiras, coleta, odores e conservação"],
  ["Hidráulica", "Vazamentos, infiltrações e reservatórios"],
  ["Fachada e cobertura", "Trincas, telhado, calhas e áreas externas"],
  ["Documentação local", "Quadros, avisos, livros e registros de manutenção"],
];

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createVisitDraft(condominium: CondoOption): VisitDraft {
  return {
    localId: uid(),
    condominiumId: condominium.id,
    condominiumName: condominium.name,
    condominiumAddress: [condominium.address, condominium.city].filter(Boolean).join(" — ") || null,
    startedAt: new Date().toISOString(),
    summary: "",
    items: DEFAULT_CHECKLIST.map(([area, title]) => ({
      clientId: uid(),
      area,
      title,
      status: "pending",
      notes: "",
      dueDate: null,
      photoId: null,
      photoName: null,
      photoType: null,
    })),
  };
}

export function createCustomItem(area: string, title: string): VisitDraftItem {
  return {
    clientId: uid(),
    area,
    title,
    status: "attention",
    notes: "",
    dueDate: futureDate(7),
    photoId: null,
    photoName: null,
    photoType: null,
    isCustom: true,
  };
}

export function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function loadVisitDraft(): VisitDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitDraft;
    return parsed?.localId && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveVisitDraft(draft: VisitDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearVisitDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function cacheCondominiums(condominiums: CondoOption[]) {
  localStorage.setItem(CONDOS_KEY, JSON.stringify(condominiums));
}

export function loadCachedCondominiums(): CondoOption[] {
  try {
    const raw = localStorage.getItem(CONDOS_KEY);
    return raw ? (JSON.parse(raw) as CondoOption[]) : [];
  } catch {
    return [];
  }
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local."));
  });
}

export async function saveVisitPhoto(photoId: string, blob: Blob) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put(blob, photoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Não foi possível salvar a foto."));
  });
  db.close();
}

export async function getVisitPhoto(photoId: string): Promise<Blob | null> {
  const db = await openPhotoDb();
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readonly");
    const request = tx.objectStore(PHOTO_STORE).get(photoId);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir a foto."));
  });
  db.close();
  return result;
}

export async function deleteVisitPhoto(photoId: string) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).delete(photoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Não foi possível remover a foto."));
  });
  db.close();
}

export async function clearDraftPhotos(draft: VisitDraft) {
  await Promise.all(
    draft.items
      .map(item => item.photoId)
      .filter((photoId): photoId is string => Boolean(photoId))
      .map(photoId => deleteVisitPhoto(photoId).catch(() => undefined)),
  );
}

export async function compressVisitPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem.");
  if (file.size > 15 * 1024 * 1024) throw new Error("A foto deve ter no máximo 15 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      element.src = objectUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a foto."))),
        "image/jpeg",
        0.78,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Não foi possível preparar a foto."));
    reader.readAsDataURL(blob);
  });
}

async function fieldApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre novamente.");

  const response = await fetch(`/api/field-visits${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

export async function listFieldVisits() {
  return fieldApi<{ visits: RecentVisit[] }>("/");
}

export async function getFieldVisit(id: number) {
  return fieldApi<{ visit: VisitDetail }>(`/${id}`);
}

export async function completeFieldVisit(
  draft: VisitDraft,
  documentIds: Record<string, number | null>,
) {
  return fieldApi<{
    id: number;
    completedAt: string;
    totalItems: number;
    okCount: number;
    attentionCount: number;
    urgentCount: number;
    pendingCount: number;
    generatedObligationIds: number[];
  }>("/complete", {
    method: "POST",
    body: JSON.stringify({
      condominiumId: draft.condominiumId,
      startedAt: draft.startedAt,
      summary: draft.summary || null,
      items: draft.items.map(item => ({
        clientId: item.clientId,
        area: item.area,
        title: item.title,
        status: item.status,
        notes: item.notes || null,
        dueDate: item.dueDate,
        documentId: documentIds[item.clientId] || null,
      })),
    }),
  });
}
