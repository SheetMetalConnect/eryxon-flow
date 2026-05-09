/**
 * Camera capture wrapper.
 *
 * Used for NCR / quality issue photos. Native capture goes through the system
 * camera UI; on the web we use a hidden file input with capture="environment"
 * which Android Chrome routes to the camera app.
 *
 * Returns a base64-encoded JPEG string (without the data URL prefix) plus the
 * inferred mime type, ready to upload to Supabase storage.
 */

import { isNativeApp } from "./platform";

export interface PhotoResult {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface CapacitorCameraModule {
  Camera: {
    getPhoto: (opts: {
      quality?: number;
      allowEditing?: boolean;
      resultType: string;
      source?: string;
      width?: number;
      height?: number;
      correctOrientation?: boolean;
      saveToGallery?: boolean;
    }) => Promise<{
      base64String?: string;
      format: string;
      webPath?: string;
    }>;
  };
  CameraResultType: { Base64: string };
  CameraSource: { Camera: string; Photos: string; Prompt: string };
}

export async function capturePhoto(opts: {
  quality?: number;
  maxWidth?: number;
} = {}): Promise<PhotoResult | null> {
  const quality = opts.quality ?? 75;
  const width = opts.maxWidth ?? 1920;

  if (isNativeApp()) {
    const mod = (await import("@capacitor/camera")) as unknown as
      CapacitorCameraModule;
    const photo = await mod.Camera.getPhoto({
      quality,
      allowEditing: false,
      resultType: mod.CameraResultType.Base64,
      source: mod.CameraSource.Camera,
      width,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.base64String) return null;
    return {
      base64: photo.base64String,
      mimeType: `image/${photo.format || "jpeg"}`,
    };
  }

  return capturePhotoWeb(quality, width);
}

function capturePhotoWeb(
  quality: number,
  maxWidth: number
): Promise<PhotoResult | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (input.parentNode === document.body) {
        document.body.removeChild(input);
      }
      fn();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        settle(() => resolve(null));
        return;
      }
      try {
        const result = await downscaleAndEncode(file, quality, maxWidth);
        settle(() => resolve(result));
      } catch (err) {
        settle(() => reject(err));
      }
    };
    // Modern Chromium fires this when the user dismisses the picker.
    input.oncancel = () => settle(() => resolve(null));

    input.click();
  });
}

async function downscaleAndEncode(
  file: File,
  quality: number,
  maxWidth: number
): Promise<PhotoResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("Image encode failed"))),
        "image/jpeg",
        quality / 100
      )
    );
    const base64 = await blobToBase64(blob);
    return { base64, mimeType: "image/jpeg", width: w, height: h };
  } finally {
    // Release the GPU-backed bitmap; otherwise repeated captures can OOM the
    // WebView on cheap tablets.
    bitmap.close();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
