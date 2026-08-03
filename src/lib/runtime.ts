import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

const configuredBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const isNativeApp =
  Capacitor.isNativePlatform() || String(import.meta.env.VITE_NATIVE_APP || "").toLowerCase() === "true";

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${configuredBase}${normalized}`;
}

export async function impact(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNativeApp) return;
  await Haptics.impact({ style }).catch(() => undefined);
}

export async function shareContent(input: { title: string; text?: string; url?: string }) {
  if (isNativeApp) {
    await Share.share(input).catch(() => undefined);
    return;
  }
  if (navigator.share) {
    await navigator.share(input).catch(() => undefined);
    return;
  }
  const value = input.url || input.text || "";
  if (value) await navigator.clipboard.writeText(value);
}

export function applyNativeDocumentClass() {
  if (!isNativeApp) return;
  document.documentElement.classList.add("native-app");
  document.body.classList.add("native-app");
}
