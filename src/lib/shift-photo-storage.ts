import { supabase } from "@/integrations/supabase/client";
import { extractFilePath } from "./storage-utils";

export const SHIFT_PHOTOS_BUCKET = "shift-photos";

const FALLBACK_EXTENSION = "jpg";
const MAX_IMAGE_UPLOAD_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_RETRIES = 3;
const UPLOAD_TIMEOUT_MS = 45_000;

const resolveFileExtension = (file: File) => {
  const fromMime = file.type?.split("/")?.[1]?.toLowerCase()?.split(";")?.[0];
  const fromName = file.name?.split(".")?.pop()?.toLowerCase();
  const extension = fromMime || fromName || FALLBACK_EXTENSION;

  return extension === "jpeg" ? "jpg" : extension;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUploadErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown upload error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: string }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return String(error);
};

const isRetriableUploadError = (error: unknown) => {
  const message = getUploadErrorMessage(error).toLowerCase();
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : NaN;

  if (!Number.isNaN(statusCode) && statusCode >= 500) return true;

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("UPLOAD_TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
};

export const prepareShiftPhotoForUpload = async (file: File): Promise<File> => {
  if (!file || file.size === 0) {
    throw new Error("קובץ התמונה ריק או לא תקין");
  }

  if (!file.type?.startsWith("image/")) return file;

  const mimeType = file.type.toLowerCase();
  const isAlreadyWebSafeJpeg = mimeType === "image/jpeg" || mimeType === "image/jpg";
  if (isAlreadyWebSafeJpeg && file.size <= MAX_IMAGE_UPLOAD_SIZE_BYTES) return file;
  if (typeof window === "undefined" || typeof document === "undefined") return file;

  try {
    console.log("[prepareShiftPhotoForUpload] decoding image", file.name, file.size, file.type);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("IMAGE_DECODE_TIMEOUT"));
      }, 15000);

      img.onload = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        reject(new Error("IMAGE_DECODE_FAILED"));
      };

      img.src = objectUrl;
    });

    const largestDimension = Math.max(image.width, image.height);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / largestDimension);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!optimizedBlob || optimizedBlob.size === 0 || optimizedBlob.size >= file.size) {
      console.log("[prepareShiftPhotoForUpload] keeping original (optimized not smaller)");
      return file;
    }

    const baseName = file.name?.replace(/\.[^.]+$/, "") || "camera-photo";
    console.log("[prepareShiftPhotoForUpload] optimized", file.size, "->", optimizedBlob.size);
    return new File([optimizedBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[prepareShiftPhotoForUpload] preparation failed, using original file", err);
    return file;
  }
};

export const normalizeShiftPhotoPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return extractFilePath(value, SHIFT_PHOTOS_BUCKET) ?? value;
};

const getAuthenticatedUserId = async (fallbackUserId?: string): Promise<string> => {
  if (typeof fallbackUserId === "string" && fallbackUserId.trim().length > 0) {
    return fallbackUserId.trim();
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user?.id) {
    return userData.user.id;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshData.session?.user?.id) {
    return refreshData.session.user.id;
  }

  throw new Error("AUTH_REQUIRED: Missing authenticated session");
};

export async function uploadShiftPhoto(params: {
  file: File;
  photoId: string;
  userId?: string;
}): Promise<string> {
  console.log("[uploadShiftPhoto] Starting upload for photoId:", params.photoId);
  const authenticatedUserId = await getAuthenticatedUserId(params.userId);
  console.log("[uploadShiftPhoto] Authenticated userId:", authenticatedUserId);
  const optimizedFile = await prepareShiftPhotoForUpload(params.file);
  const uploadCandidates = optimizedFile === params.file ? [params.file] : [optimizedFile, params.file];

  let lastError: unknown = null;

  for (const candidateFile of uploadCandidates) {
    const extension = resolveFileExtension(candidateFile);

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
      const filePath = `${authenticatedUserId}/drafts/${params.photoId}_${Date.now()}.${extension}`;

      try {
        const { error } = await withTimeout(
          supabase.storage.from(SHIFT_PHOTOS_BUCKET).upload(filePath, candidateFile, {
            contentType: candidateFile.type || "image/jpeg",
            upsert: true,
            cacheControl: "3600",
          }),
          UPLOAD_TIMEOUT_MS
        );

        if (!error) {
          const { error: signedUrlError } = await supabase.storage
            .from(SHIFT_PHOTOS_BUCKET)
            .createSignedUrl(filePath, 60);

          if (signedUrlError) {
            lastError = signedUrlError;
            break;
          }

          return filePath;
        }

        lastError = error;
      } catch (error) {
        lastError = error;
      }

      const shouldRetry = attempt < MAX_UPLOAD_RETRIES && isRetriableUploadError(lastError);
      if (!shouldRetry) break;

      await delay(350 * attempt);
    }
  }

  throw new Error(getUploadErrorMessage(lastError));
}

export async function deleteShiftPhoto(pathOrUrl?: string | null): Promise<void> {
  const normalizedPath = normalizeShiftPhotoPath(pathOrUrl);
  if (!normalizedPath) return;

  const { error } = await supabase.storage.from(SHIFT_PHOTOS_BUCKET).remove([normalizedPath]);

  if (error) {
    throw error;
  }
}