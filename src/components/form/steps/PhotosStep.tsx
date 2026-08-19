import { useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";
import { saveShiftPhotosDraft, loadShiftPhotosDraft } from "@/lib/shift-photos-draft";

type PhotosMap = Record<string, string | undefined>;

export function PhotosStep() {
  const { setValue, register, getValues } = useFormContext();
  const { user } = useAuth();

  // Stable ref so callbacks don't need user in their dep array
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Lazy init: merge RHF values (same session) + localStorage draft (tab-kill recovery).
  // This runs synchronously on first render, BEFORE the parent's reset() useEffect fires,
  // so we must read the draft directly here rather than relying on getValues() alone.
  const [photoState, setPhotoState] = useState<PhotosMap>(() => {
    const rhfPhotos = (getValues("photos") ?? {}) as PhotosMap;
    const draft = loadShiftPhotosDraft(user?.id);
    const initial: PhotosMap = {};
    VEHICLE_PHOTOS.forEach((p) => {
      const v = rhfPhotos[p.id] || draft[p.id];
      if (typeof v === "string" && v.trim()) initial[p.id] = v;
    });
    return initial;
  });

  // Always-current snapshot of photoState used by callbacks below.
  // This avoids calling saveShiftPhotosDraft inside a setState updater, which
  // React 18 Strict Mode can invoke twice, causing duplicate side-effects.
  const latestPhotoStateRef = useRef<PhotosMap>(photoState);
  latestPhotoStateRef.current = photoState;

  // After mount: merge localStorage draft (survives Android tab-kill / page reload)
  useEffect(() => {
    const draft = loadShiftPhotosDraft(user?.id);
    if (!Object.keys(draft).length) return;
    setPhotoState((prev) => {
      const merged: PhotosMap = {};
      VEHICLE_PHOTOS.forEach((p) => {
        merged[p.id] = prev[p.id] || draft[p.id];
      });
      // Call setValue for any photo that draft has but RHF doesn't.
      // Check getValues() (not prev) because prev is already populated from the
      // lazy init — using prev would skip setValue even when RHF is still empty.
      VEHICLE_PHOTOS.forEach((p) => {
        if (merged[p.id] && !getValues(`photos.${p.id}`)) {
          setValue(`photos.${p.id}`, merged[p.id], { shouldDirty: true });
        }
      });
      return merged;
    });
  }, [user?.id, setValue, getValues]);

  // When the user returns from the native camera (page becomes visible), re-sync
  // photo state from localStorage.  This covers two scenarios:
  //   1. The upload completed and onUploaded fired, but Android Chrome's scheduler
  //      didn't flush the React state update before the user looked at the screen.
  //   2. BFCache page restore (pageshow) — the page snapshot may pre-date a fast upload.
  useEffect(() => {
    const syncFromDraft = () => {
      const draft = loadShiftPhotosDraft(userIdRef.current);
      if (!Object.keys(draft).length) return;
      const prev = latestPhotoStateRef.current;
      const merged: PhotosMap = {};
      let changed = false;
      VEHICLE_PHOTOS.forEach((p) => {
        merged[p.id] = prev[p.id] || draft[p.id];
        if (merged[p.id] !== prev[p.id]) changed = true;
      });
      if (!changed) return;
      setPhotoState(merged);
      // Use getValues() (not prev) to check the RHF state — prev reflects local
      // display state which may already include the photo, while RHF might still
      // be empty if the setValue call was missed during a token-refresh remount.
      VEHICLE_PHOTOS.forEach((p) => {
        if (merged[p.id] && !getValues(`photos.${p.id}`)) {
          setValue(`photos.${p.id}`, merged[p.id], { shouldDirty: true });
        }
      });
    };

    // visibilitychange: returning from camera app or switching tabs
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // 1 500 ms delay: give any in-flight upload a chance to call
        // saveShiftPhotosDraft before we read it.
        setTimeout(syncFromDraft, 1500);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    // pageshow fires on BFCache restore; sync immediately (upload already finished)
    window.addEventListener("pageshow", syncFromDraft);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", syncFromDraft);
    };
  }, [setValue, getValues]);

  const handlePhotoUploaded = useCallback(
    (photoId: string, storagePath: string) => {
      const next = { ...latestPhotoStateRef.current, [photoId]: storagePath };
      // Persist immediately so a page reload doesn't lose the photo
      saveShiftPhotosDraft(userIdRef.current, next);
      setPhotoState(next);
      setValue(`photos.${photoId}`, storagePath, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handlePhotoRemoved = useCallback(
    (photoId: string) => {
      const next = { ...latestPhotoStateRef.current, [photoId]: undefined };
      saveShiftPhotosDraft(userIdRef.current, next);
      setPhotoState(next);
      setValue(`photos.${photoId}`, "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue],
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
              : "border-primary/20 bg-primary/5 text-primary",
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
