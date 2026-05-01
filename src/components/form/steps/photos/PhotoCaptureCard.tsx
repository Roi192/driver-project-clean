import { useCallback, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { uploadShiftPhoto, deleteShiftPhoto } from "@/lib/shift-photo-storage";
import { isNativePlatform, takePhotoCameraOnly } from "@/lib/capacitor-camera";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNative = isNativePlatform();

  const hasPhoto = Boolean(storedPath) || Boolean(localPreview);
  const previewSrc = localPreview ?? storedPath ?? undefined;
  const isDisabled = disabled || uploading;

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (processingRef.current || uploading) return;
      processingRef.current = true;

      // Generate preview
      const reader = new FileReader();
      reader.onload = () => setLocalPreview(reader.result as string);
      reader.readAsDataURL(blob);

      const file = new File([blob], `${photoId}_${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      setUploading(true);

      try {
        const previousStoredPath = storedPath;
        const path = await uploadShiftPhoto({ file, photoId });

        console.log("[PhotoCapture] upload success", photoId, path);
        onUploaded(photoId, path);

        if (previousStoredPath && previousStoredPath !== path) {
          await deleteShiftPhoto(previousStoredPath).catch(() => {});
        }

        toast({ title: "✅ התמונה הועלתה בהצלחה", description: label });
      } catch (error) {
        setLocalPreview(null);
        const message = error instanceof Error ? error.message : "אירעה שגיאה";
        console.error("[PhotoCapture] upload failed", photoId, message);
        toast({
          title: "❌ העלאת התמונה נכשלה",
          description: `${label} - ${message}`,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        processingRef.current = false;
      }
    },
    [label, onUploaded, photoId, storedPath, uploading]
  );

  const handleCardClick = useCallback(async () => {
    if (isDisabled) return;

    if (isNative) {
      try {
        const file = await takePhotoCameraOnly();
        if (file) {
          await uploadBlob(file);
        }
      } catch (error) {
        console.error("[PhotoCapture] native camera error", error);
        toast({
          title: "שגיאה במצלמה",
          description: "לא ניתן לפתוח את המצלמה. נסה שוב.",
          variant: "destructive",
        });
      }
      return;
    }

    // Web: trigger native browser camera (no gallery on mobile thanks to capture attr)
    fileInputRef.current?.click();
  }, [isDisabled, isNative, uploadBlob]);

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // reset so same file can be re-selected
      event.target.value = "";
      if (!file) return;
      await uploadBlob(file);
    },
    [uploadBlob]
  );

  const handleRemove = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setLocalPreview(null);
    if (storedPath) {
      await deleteShiftPhoto(storedPath).catch(() => {});
    }
    onRemoved(photoId);
  };

  return (
    <>
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
          <CardContent
            uploading={uploading}
            hasPhoto={hasPhoto}
            previewSrc={previewSrc}
            label={label}
          />
        </button>
        <PhotoOverlays hasPhoto={hasPhoto} uploading={uploading} label={label} onRemove={handleRemove} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
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
      <img src={previewSrc} alt={label} className="h-full w-full object-cover" loading="lazy" />
    ) : (
      <StorageImage
        src={previewSrc}
        bucket="shift-photos"
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
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