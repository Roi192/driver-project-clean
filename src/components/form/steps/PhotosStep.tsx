import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";

type PhotosMap = Record<string, string | undefined>;

// Global debug counter — survives component unmount/remount so we can tell
// if handlePhotoUploaded is being called even if React state isn't updating.
const _g = (window as unknown as Record<string, number>);
_g.__dbgPhotoCallCount = _g.__dbgPhotoCallCount ?? 0;

export function PhotosStep() {
  const { setValue, register, getValues } = useFormContext();

  // Local state drives the counter and card previews.
  // Lazy initializer reads RHF on first mount so sessionStorage restores are picked up.
  // Direct setState calls in handlers guarantee immediate UI update — no useWatch delay.
  const [photoState, setPhotoState] = useState<PhotosMap>(() => {
    const saved = (getValues("photos") ?? {}) as PhotosMap;
    const initial: PhotosMap = {};
    VEHICLE_PHOTOS.forEach((p) => {
      const v = saved[p.id];
      if (typeof v === "string" && v.trim()) initial[p.id] = v;
    });
    return initial;
  });

  // Debug: tracks how many times handlePhotoUploaded fired (survives re-renders)
  const callCountRef = useRef(0);
  const [debugCallCount, setDebugCallCount] = useState(0);
  const [debugLastId, setDebugLastId] = useState("");

  const handlePhotoUploaded = useCallback(
    (photoId: string, storagePath: string) => {
      // Debug instrumentation
      callCountRef.current += 1;
      _g.__dbgPhotoCallCount += 1;
      setDebugCallCount(callCountRef.current);
      setDebugLastId(photoId);

      // Update local UI state immediately (counter, storedPath prop)
      setPhotoState((prev) => ({ ...prev, [photoId]: storagePath }));
      // Sync to RHF so submission validation (hasAllRequiredPhotos) sees the value
      setValue(`photos.${photoId}`, storagePath, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const handlePhotoRemoved = useCallback(
    (photoId: string) => {
      setPhotoState((prev) => ({ ...prev, [photoId]: undefined }));
      setDebugLastId("");
      setValue(`photos.${photoId}`, "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const completedPhotos = VEHICLE_PHOTOS.filter((p) => Boolean(photoState[p.id])).length;
  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 5 מתוך 5</span>
        </div>
        <h2 className="mb-3 text-3xl font-black text-foreground">תמונות הרכב</h2>
        <p className="text-muted-foreground">צלם את כל תמונות הרכב מהמצלמה</p>

        <div
          className={cn(
            "mt-5 inline-flex items-center gap-3 rounded-full border px-5 py-2.5",
            allPhotosCompleted
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-primary/20 bg-primary/5 text-primary"
          )}
        >
          {allPhotosCompleted && <Sparkles className="h-4 w-4" />}
          <span className="font-bold">
            {completedPhotos} / {VEHICLE_PHOTOS.length}
          </span>
          <span className="text-muted-foreground">תמונות הועלו</span>
          {allPhotosCompleted && <Check className="h-4 w-4" />}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(completedPhotos / VEHICLE_PHOTOS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_PHOTOS.map((photo, index) => (
          <PhotoCaptureCard
            key={photo.id}
            photoId={photo.id}
            label={photo.label}
            storedPath={photoState[photo.id]}
            disabled={false}
            animationDelayMs={index * 80}
            onUploaded={handlePhotoUploaded}
            onRemoved={handlePhotoRemoved}
          />
        ))}
      </div>

      {/* TEMP DEBUG — remove after diagnosis */}
      <div className="mt-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 text-xs text-slate-800 space-y-1">
        <p className="font-bold text-yellow-700">🔍 דיאגנוזה — דווח על הנתונים הבאים:</p>
        <p>handlePhotoUploaded נקרא: <strong className="text-green-700">{debugCallCount} פעמים</strong></p>
        <p>תמונה אחרונה: <strong>{debugLastId || "—"}</strong></p>
        <p>photoState keys: <strong>{Object.keys(photoState).filter(k => photoState[k]).join(", ") || "ריק"}</strong></p>
        <p>completedPhotos: <strong>{completedPhotos}</strong></p>
        <p>window counter: <strong>{_g.__dbgPhotoCallCount}</strong></p>
      </div>
      {/* END TEMP DEBUG */}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">הערות או בעיות ברכב</h3>
            <p className="text-sm text-slate-500">אופציונלי - תאר בעיות שנמצאו</p>
          </div>
        </div>
        <Textarea
          {...register("vehicleNotes")}
          placeholder="לדוגמה: שריטה בדלת ימנית, נורת אזהרה דולקת..."
          className="min-h-[100px] resize-none rounded-xl border-border bg-white text-slate-800 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
