import { useCallback, useEffect, useRef, useState } from "react";
import { X, RotateCcw, Loader2 } from "lucide-react";

interface CameraModalProps {
  label: string;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  onFallback: () => void;
}

export function CameraModal({ label, onCapture, onClose, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (mode: "environment" | "user") => {
      stopStream();
      setReady(false);
      setError(null);

      const attachStream = (stream: MediaStream) => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setReady(true))
            .catch(() => {
              if (streamRef.current?.active) setReady(true);
            });
        } else {
          setReady(true);
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        attachStream(stream);
      } catch (firstErr) {
        const e = firstErr as Error;
        if (
          e.name === "NotAllowedError" ||
          e.name === "PermissionDeniedError" ||
          e.name === "SecurityError"
        ) {
          // Permission denied — show instructions instead of silently falling back
          setError("הרשאת מצלמה נדחתה");
          return;
        }
        // facing constraint failed (single-camera or OverconstrainedError) — retry without it
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          attachStream(stream);
        } catch (secondErr) {
          const e2 = secondErr as Error;
          if (
            e2.name === "NotAllowedError" ||
            e2.name === "PermissionDeniedError" ||
            e2.name === "SecurityError"
          ) {
            setError("הרשאת מצלמה נדחתה");
          } else {
            setError("לא ניתן לגשת למצלמה");
          }
        }
      }
    },
    [onFallback, stopStream]
  );

  useEffect(() => {
    startStream("environment");
    return stopStream;
  }, [startStream, stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const MAX_W = 1600;
    const MAX_H = 1200;
    let w = video.videoWidth || MAX_W;
    let h = video.videoHeight || MAX_H;
    if (w > MAX_W || h > MAX_H) {
      const ratio = Math.min(MAX_W / w, MAX_H / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopStream();
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.82
    );
  }, [ready, onCapture, stopStream]);

  const toggleFacing = useCallback(() => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    startStream(next);
  }, [facing, startStream]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ touchAction: "none" }}
    >
      {/* Top bar */}
      <div
        className="relative flex items-center justify-center"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)", paddingBottom: "12px" }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="סגור מצלמה"
          className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-full bg-black/60 px-5 py-2 text-sm font-bold text-white">
          {label}
        </span>
      </div>

      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />

        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <span className="text-sm text-white/70">מפעיל מצלמה...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black px-8 text-center">
            <p className="text-xl font-bold text-white">{error}</p>
            {error.includes("הרשאת") ? (
              <>
                <p className="text-sm text-white/70 leading-relaxed">
                  כדי לאפשר מצלמה פנימית בדפדפן:
                  {"\n"}הגדרות אנדרואיד ← אפליקציות ← Chrome ← הרשאות ← מצלמה ← אפשר
                </p>
                <button
                  type="button"
                  onClick={onFallback}
                  className="rounded-2xl bg-white px-8 py-3 text-sm font-bold text-black"
                >
                  צלם עם מצלמת הטלפון במקום
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onFallback}
                className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-black"
              >
                בחר תמונה מהגלריה
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="flex items-center justify-between bg-black px-10"
        style={{
          paddingTop: "24px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
        }}
      >
        {/* Flip camera */}
        <button
          type="button"
          onClick={toggleFacing}
          aria-label="החלף מצלמה"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"
        >
          <RotateCcw className="h-6 w-6" />
        </button>

        {/* Shutter */}
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          aria-label="צלם תמונה"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform active:scale-90 disabled:opacity-40"
        >
          <div className="h-[60px] w-[60px] rounded-full bg-white" />
        </button>

        {/* Balance spacer */}
        <div className="h-12 w-12" />
      </div>
    </div>
  );
}
