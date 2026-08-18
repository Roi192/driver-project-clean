import { useCallback, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  uploadShiftPhoto,
  deleteShiftPhoto,
  prepareShiftPhotoForUpload,
} from "@/lib/shift-photo-storage";
import { CameraLog } from "@/lib/camera-logger";

// Data URLs embed the image bytes in the string — unlike blob: URLs they survive
// tab backgrounding and memory-pressure events on low-end Android.
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });

/**
 * Creates a temporary, body-level file input and clicks it.
 *
 * Full-size but invisible — avoids the Android Chrome bug where a 1×1 px or
 * clipped element never fires the `change` event after returning from the
 * camera / gallery.  pointer-events:none ensures it never blocks taps.
 *
 * Secondary `visibilitychange` signal handles the case where the user returns
 * from the native camera app but the `change` event is delayed or lost.
 *
 * `capture="environment"` opens the rear camera directly (no gallery choice).
 */
const openNativePicker = (
  accept: string,
  onFile: (f: File) => void,
  capture?: string,
) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  if (capture) input.setAttribute("capture", capture);
  // Full-size but invisible — avoids Android Chrome ignoring clicks on micro-elements
  input.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(input);

  let resolved = false;
  // `let` so onVisChange can replace the safety timeout with a poll timeout
  let timeoutId: ReturnType<typeof setTimeout>;

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisChange);
    clearTimeout(timeoutId);
    try {
      document.body.removeChild(input);
    } catch {
      // already removed
    }
  };

  const resolve = (file: File | null) => {
    if (resolved) return;
    resolved = true;
    cleanup();
    if (file) onFile(file);
  };

  input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });

  // Secondary signal: visibilitychange fires when the user returns from the camera app.
  //
  // Android Chrome quirk: the `change` event sometimes fires 500 ms–2 s AFTER
  // visibilitychange, or not at all — but input.files IS populated once Android
  // delivers the Intent result.  We poll every 200 ms for up to 5 s rather than
  // doing a single 400 ms check (the old approach could call resolve(null) before
  // the file was ready, setting resolved=true and silently dropping the file).
  const onVisChange = () => {
    if (document.visibilityState === "visible") {
      document.removeEventListener("visibilitychange", onVisChange);
      clearTimeout(timeoutId); // cancel the 10-min safety timeout
      let polls = 0;
      const poll = () => {
        if (resolved) return; // `change` already fired — nothing to do
        const file = input.files?.[0];
        if (file) { resolve(file); return; }
        polls++;
        if (polls < 25) { // 25 × 200 ms = 5 s total
          timeoutId = setTimeout(poll, 200);
        } else {
          resolve(null); // no file after 5 s → user cancelled or camera failed
        }
      };
      timeoutId = setTimeout(poll, 200); // first check after 200 ms
    }
  };
  document.addEventListener("visibilitychange", onVisChange);

  // 10-minute safety cleanup in case neither change nor visibilitychange ever fires
  timeoutId = setTimeout(() => resolve(null), 10 * 60 * 1000);

  input.click();
};

interface PhotoCaptureCardProps {
  photoId: string;
  label: string;
  storedPath?: string;
  disabled?: boolean;
  animationDelayMs?: number;
  onUploaded: (photoId: string, storagePath: string) => void;
  onRemoved: (photoId: string) => void;
}

export function PhotoCaptureCard({
  photoId,
  label,
  storedPath,
  disabled,
  animationDelayMs = 0,
  onUploaded,
  onRemoved,
}: PhotoCaptureCardProps) {
  const processingRef = useRef(false);

  // acquiring: file selected but preview not yet ready (prepareShiftPhotoForUpload + FileReader)
  // uploading: preview ready, Supabase upload in progress
  const [acquiring, setAcquiring] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const hasPhoto = Boolean(storedPath) || Boolean(localPreview);
  const previewSrc = localPreview ?? storedPath ?? undefined;
  const isDisabled = disabled || acquiring || uploading;

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (processingRef.current) return;
      processingRef.current = true;

      const originalType = (blob.type || "").toLowerCase();
      const originalName = blob instanceof File ? blob.name || "" : "";
      const extFromName = (originalName.split(".").pop() ?? "").toLowerCase();

      const isLikelyHeic =
        originalType.includes("heic") ||
        originalType.includes("heif") ||
        extFromName === "heic" ||
        extFromName === "heif";

      // Blobs produced by canvas.toBlob("image/jpeg") are always JPEG — they
      // are plain Blobs (not File instances) with type "image/jpeg".  Never
      // treat them as HEIC regardless of what the original file was.
      let file: File;
      if (isLikelyHeic) {
        file = new File([blob], `${photoId}_${Date.now()}.heic`, {
          type: "image/heic",
          lastModified: Date.now(),
        });
      } else {
        file = new File([blob], `${photoId}_${Date.now()}.jpg`, {
          type: blob.type || "image/jpeg",
          lastModified: Date.now(),
        });
      }

      CameraLog.uploadStarted(photoId, file.size);

      try {
        // Phase 1: prepare + local preview
        setAcquiring(true);
        const uploadFile = await prepareShiftPhotoForUpload(file);
        const dataUrl = await readFileAsDataUrl(uploadFile);
        setLocalPreview(dataUrl);
        setAcquiring(false);

        // Phase 2: upload to Supabase
        setUploading(true);
        const previousStoredPath = storedPath;
        const path = await uploadShiftPhoto({ file: uploadFile, photoId });

        // onUploaded calls saveShiftPhotosDraft synchronously — localStorage is
        // written before we schedule the reload below.
        onUploaded(photoId, path);
        CameraLog.uploadSuccess(photoId, path);

        if (previousStoredPath && previousStoredPath !== path) {
          await deleteShiftPhoto(previousStoredPath).catch(() => {});
        }

        toast({ title: "התמונה נטענה ונשמרה", description: label });

        // Reload so the photo renders from localStorage/storedPath immediately.
        // Auth-state refreshes on Android Chrome can remount PhotoCaptureCard and
        // lose localPreview before the user sees it — a page reload sidesteps this
        // entirely: the new page reads storedPath from localStorage on mount.
        setTimeout(() => window.location.reload(), 600);
      } catch (error) {
        const message = error instanceof Error ? error.message : "אירעה שגיאה";
        CameraLog.uploadFailed(photoId, message);
        setLocalPreview(null);

        const isAuthError =
          message.includes("AUTH_REQUIRED") ||
          message.toLowerCase().includes("jwt") ||
          message.toLowerCase().includes("session");

        if (isAuthError) {
          toast({
            title: "פג תוקף ההתחברות",
            description: "ההתחברות שלך פגה. מעביר אותך לדף ההתחברות.",
            variant: "destructive",
          });
          setTimeout(() => {
            const current = window.location.pathname + window.location.search;
            window.location.href = `/auth?redirect=${encodeURIComponent(current)}`;
          }, 1800);
        } else {
          toast({
            title: "העלאת התמונה נכשלה",
            description: `${label} — ${message}`,
            variant: "destructive",
          });
        }
      } finally {
        setAcquiring(false);
        setUploading(false);
        processingRef.current = false;
      }
    },
    [label, onUploaded, photoId, storedPath],
  );

  // Always open the native rear camera — no getUserMedia, no in-app modal.
  // This avoids browser camera permission prompts and works reliably on Android.
  const handleCardClick = useCallback(() => {
    if (isDisabled) return;
    CameraLog.nativeFallbackStarted();
    openNativePicker(
      "image/*",
      (file) => {
        CameraLog.nativeFileReceived(file.name, file.size, file.type);
        void uploadBlob(file);
      },
      "environment",
    );
  }, [isDisabled, uploadBlob]);

  const handleRemove = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLocalPreview(null);
    if (storedPath) await deleteShiftPhoto(storedPath).catch(() => {});
    onRemoved(photoId);
  };

  return (
    <div
      className="relative animate-fade-in"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleCardClick}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300",
          hasPhoto
            ? "border-primary shadow-lg"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
          isDisabled && "cursor-not-allowed opacity-90",
        )}
      >
        <CardContent
          acquiring={acquiring}
          uploading={uploading}
          hasPhoto={hasPhoto}
          previewSrc={previewSrc}
          label={label}
        />
      </button>
      <PhotoOverlays
        hasPhoto={hasPhoto}
        uploading={uploading || acquiring}
        label={label}
        onRemove={handleRemove}
      />
    </div>
  );
}

/* ── Sub-components ── */

function CardContent({
  acquiring,
  uploading,
  hasPhoto,
  previewSrc,
  label,
}: {
  acquiring: boolean;
  uploading: boolean;
  hasPhoto: boolean;
  previewSrc?: string;
  label: string;
}) {
  if (acquiring) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">אוסף תמונה...</span>
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">מעלה תמונה...</span>
      </div>
    );
  }

  if (hasPhoto && previewSrc) {
    const isLocal = previewSrc.startsWith("blob:") || previewSrc.startsWith("data:");
    return isLocal ? (
      <img src={previewSrc} alt={label} className="h-full w-full object-cover" loading="eager" />
    ) : (
      <StorageImage
        src={previewSrc}
        bucket="shift-photos"
        alt={label}
        className="h-full w-full object-cover"
        loading="eager"
        showLoader={false}
        fallback={<div className="h-full w-full bg-muted" />}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
        <Camera className="h-7 w-7 text-primary" />
      </div>
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <span className="text-xs font-medium text-slate-500">לחץ לצילום</span>
    </div>
  );
}

function PhotoOverlays({
  hasPhoto,
  uploading,
  label,
  onRemove,
}: {
  hasPhoto: boolean;
  uploading: boolean;
  label: string;
  onRemove: (e: React.MouseEvent) => void;
}) {
  if (!hasPhoto || uploading) return null;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-lg border border-primary/20 bg-card/85 px-2 py-1 text-center text-xs font-medium text-primary backdrop-blur-sm">
        לחץ לצילום מחדש
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -left-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
        aria-label={`הסר ${label}`}
      >
        <X className="h-5 w-5" />
      </button>
      <div className="absolute -right-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-scale-in">
        <Check className="h-5 w-5" />
      </div>
    </>
  );
}
