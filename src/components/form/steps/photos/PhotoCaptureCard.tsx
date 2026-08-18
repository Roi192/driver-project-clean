import { useCallback, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { uploadShiftPhoto, deleteShiftPhoto, prepareShiftPhotoForUpload } from "@/lib/shift-photo-storage";
import { CameraModal } from "./CameraModal";

// Data URLs embed the image bytes in the string — unlike blob: URLs they survive
// tab backgrounding and memory-pressure events on low-end Android.
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });

// Creates a temporary, body-level file input and clicks it.
// Avoids sr-only / clipping issues that prevent `onChange` from firing on some
// Android Chrome versions when programmatically clicking a hidden input element.
// `capture` = "environment" opens the rear camera directly; omit for media picker.
const openNativePicker = (
  accept: string,
  onFile: (file: File) => void,
  capture?: string,
) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  if (capture) input.setAttribute("capture", capture);
  // Invisible but NOT clipped — clipping (clip: rect) prevents camera intent return on Android
  input.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(input);

  const cleanup = () => {
    try { document.body.removeChild(input); } catch { /* already removed */ }
  };

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    cleanup();
    if (file) onFile(file);
  }, { once: true });

  // Fallback cleanup after 5 minutes in case `change` never fires (tab killed, cancelled)
  setTimeout(cleanup, 5 * 60 * 1000);

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

  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const hasPhoto = Boolean(storedPath) || Boolean(localPreview);
  const previewSrc = localPreview ?? storedPath ?? undefined;
  const isDisabled = disabled || uploading;

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setUploading(true);

      const originalType = (blob.type || "").toLowerCase();
      const originalName = blob instanceof File ? (blob.name || "") : "";
      const extFromName = (originalName.split(".").pop() ?? "").toLowerCase();
      const isLikelyHeic =
        originalType.includes("heic") || originalType.includes("heif") ||
        extFromName === "heic" || extFromName === "heif";

      const file = new File([blob], `${photoId}_${Date.now()}.jpg`, {
        type: isLikelyHeic ? "image/heic" : (blob.type || ""),
        lastModified: Date.now(),
      });

      try {
        const uploadFile = await prepareShiftPhotoForUpload(file);

        const dataUrl = await readFileAsDataUrl(uploadFile);
        setLocalPreview(dataUrl);

        const previousStoredPath = storedPath;
        const path = await uploadShiftPhoto({ file: uploadFile, photoId });

        onUploaded(photoId, path);

        if (previousStoredPath && previousStoredPath !== path) {
          await deleteShiftPhoto(previousStoredPath).catch(() => {});
        }

        toast({ title: "✅ התמונה נטענה ונשמרה", description: label });
      } catch (error) {
        const message = error instanceof Error ? error.message : "אירעה שגיאה";
        setLocalPreview(null);

        const isAuthError =
          message.includes("AUTH_REQUIRED") ||
          message.toLowerCase().includes("jwt") ||
          message.toLowerCase().includes("session");

        if (isAuthError) {
          toast({
            title: "❌ פג תוקף ההתחברות",
            description: "ההתחברות שלך פגה. מעביר אותך לדף ההתחברות.",
            variant: "destructive",
          });
          setTimeout(() => {
            const current = window.location.pathname + window.location.search;
            window.location.href = `/auth?redirect=${encodeURIComponent(current)}`;
          }, 1800);
        } else {
          toast({
            title: "❌ העלאת התמונה נכשלה",
            description: `${label} — ${message}`,
            variant: "destructive",
          });
        }
      } finally {
        setUploading(false);
        processingRef.current = false;
      }
    },
    [label, onUploaded, photoId, storedPath]
  );

  // Try to open the in-app camera modal first.
  // Falls back to native file picker (via dynamic input) if getUserMedia unavailable.
  const handleCardClick = useCallback(() => {
    if (isDisabled) return;
    if (navigator.mediaDevices?.getUserMedia) {
      setShowCamera(true);
    } else {
      // getUserMedia not available — open camera directly via native picker
      openNativePicker("image/*", (file) => uploadBlob(file), "environment");
    }
  }, [isDisabled, uploadBlob]);

  const handleCameraCapture = useCallback(
    async (blob: Blob) => {
      setShowCamera(false);
      await uploadBlob(blob);
    },
    [uploadBlob]
  );

  const handleCameraClose = useCallback(() => {
    setShowCamera(false);
  }, []);

  // Camera permission denied in CameraModal — fall back to Android media picker.
  // No `capture` attribute: the media picker is more reliable for cross-app returns
  // than a direct camera intent on Android Chrome.
  const handleCameraFallback = useCallback(() => {
    setShowCamera(false);
    openNativePicker("image/*", (file) => uploadBlob(file));
  }, [uploadBlob]);

  const handleRemove = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLocalPreview(null);
    if (storedPath) await deleteShiftPhoto(storedPath).catch(() => {});
    onRemoved(photoId);
  };

  return (
    <>
      {/* In-app camera — user stays in the browser, no tab reload on Android */}
      {showCamera && (
        <CameraModal
          label={label}
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
          onFallback={handleCameraFallback}
        />
      )}

      <div className="relative animate-fade-in" style={{ animationDelay: `${animationDelayMs}ms` }}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleCardClick}
          className={cn(
            "relative block aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300",
            hasPhoto
              ? "border-primary shadow-lg"
              : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
            isDisabled && "cursor-not-allowed opacity-90"
          )}
        >
          <CardContent uploading={uploading} hasPhoto={hasPhoto} previewSrc={previewSrc} label={label} />
        </button>
        <PhotoOverlays hasPhoto={hasPhoto} uploading={uploading} label={label} onRemove={handleRemove} />
      </div>
    </>
  );
}

/* ── Sub-components ── */

function CardContent({
  uploading,
  hasPhoto,
  previewSrc,
  label,
}: {
  uploading: boolean;
  hasPhoto: boolean;
  previewSrc?: string;
  label: string;
}) {
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
