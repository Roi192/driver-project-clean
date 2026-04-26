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

  if (extension === "jpeg") return "jpg";
  if (extension === "heic" || extension === "heif") return "jpg";

  return extension;
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
    message.includes("upload_timeout") ||
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

const maybeOptimizeImageForUpload = async (file: File): Promise<File> => {
  if (!file.type?.startsWith("image/")) return file;
  if (file.size <= MAX_IMAGE_UPLOAD_SIZE_BYTES) return file;
  if (typeof window === "undefined" || typeof document === "undefined") return file;

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
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
      return file;
    }

    const baseName = file.name?.replace(/\.[^.]+$/, "") || "camera-photo";

    return new File([optimizedBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("[uploadShiftPhoto] image optimization skipped", error);
    return file;
  }
};

export const normalizeShiftPhotoPath = (
  value: string | null | undefined
): string | null => {
  if (!value) return null;
  return extractFilePath(value, SHIFT_PHOTOS_BUCKET) ?? value;
};

const ensureSessionReady = async () => {
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.access_token && sessionData.session.user?.id) {
    return sessionData.session.user.id;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user?.id) {
    return userData.user.id;
  }

  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();

  if (!refreshError && refreshData.session?.user?.id) {
    return refreshData.session.user.id;
  }

  throw new Error("AUTH_REQUIRED: Missing authenticated session");
};

const getAuthenticatedUserId = async (fallbackUserId?: string): Promise<string> => {
  if (typeof fallbackUserId === "string" && fallbackUserId.trim().length > 0) {
    return fallbackUserId.trim();
  }

  return await ensureSessionReady();
};

export async function uploadShiftPhoto(params: {
  file: File;
  photoId: string;
  userId?: string;
}): Promise<string> {
  console.log("[uploadShiftPhoto] starting", {
    photoId: params.photoId,
    originalName: params.file.name,
    originalType: params.file.type,
    originalSize: params.file.size,
  });

  const authenticatedUserId = await getAuthenticatedUserId(params.userId);

  console.log("[uploadShiftPhoto] authenticated user", authenticatedUserId);

  const optimizedFile = await maybeOptimizeImageForUpload(params.file);
  const uploadCandidates =
    optimizedFile === params.file ? [params.file] : [optimizedFile, params.file];

  let lastError: unknown = null;

  for (const candidateFile of uploadCandidates) {
    const extension = resolveFileExtension(candidateFile);

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
      const filePath = `${authenticatedUserId}/drafts/${params.photoId}_${Date.now()}_${attempt}.${extension}`;

      try {
        console.log("[uploadShiftPhoto] attempt", {
          photoId: params.photoId,
          attempt,
          filePath,
          candidateName: candidateFile.name,
          candidateType: candidateFile.type,
          candidateSize: candidateFile.size,
        });

        await ensureSessionReady();

        const { error } = await withTimeout(
          supabase.storage.from(SHIFT_PHOTOS_BUCKET).upload(filePath, candidateFile, {
            contentType: candidateFile.type || "image/jpeg",
            upsert: true,
            cacheControl: "3600",
          }),
          UPLOAD_TIMEOUT_MS
        );

        if (!error) {
          console.log("[uploadShiftPhoto] success", { photoId: params.photoId, filePath });
          return filePath;
        }

        lastError = error;
        console.error("[uploadShiftPhoto] supabase upload error", error);
      } catch (error) {
        lastError = error;
        console.error("[uploadShiftPhoto] upload exception", error);
      }

      const shouldRetry =
        attempt < MAX_UPLOAD_RETRIES && isRetriableUploadError(lastError);

      if (!shouldRetry) {
        break;
      }

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