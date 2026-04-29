export type ClientDeviceType = "mobile" | "desktop";

export function getClientDeviceType(): ClientDeviceType {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isMobileUa = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  const isSmallViewport = typeof window.innerWidth === "number" ? window.innerWidth < 768 : false;
  return isMobileUa || isSmallViewport ? "mobile" : "desktop";
}

export function logFileRequestStart(eventName: string, file?: File | null, extra?: Record<string, unknown>) {
  console.info(eventName, {
    fileName: file?.name || null,
    fileSizeBytes: file?.size ?? null,
    fileType: file?.type || "unknown",
    device: getClientDeviceType(),
    ...(extra || {}),
  });
}
