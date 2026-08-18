import { useCallback, useEffect, useRef, useState } from "react";
import { X, RotateCcw, Loader2 } from "lucide-react";
import { CameraLog } from "@/lib/camera-logger";

interface CameraModalProps {
  label: string;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  onFallback: () => void;
}

/** Map a getUserMedia DOMException name to a Hebrew message and category. */
const getErrorMeta = (
  name: string,
): { message: string; isPermission: boolean; isAbort: boolean } => {
  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "SecurityError"
  ) {
    return { message: "הרשאת מצלמה נדחתה", isPermission: true, isAbort: false };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { message: "לא נמצאה מצלמה במכשיר", isPermission: false, isAbort: false };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      message: "המצלמה בשימוש על ידי אפליקציה אחרת",
      isPermission: false,
      isAbort: false,
    };
  }
  if (name === "AbortError") {
    return { message: "הצילום בוטל", isPermission: false, isAbort: true };
  }
  return { message: "שגיאת מצלמה", isPermission: false, isAbort: false };
};

export function CameraModal({ label, onCapture, onClose, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isAbortError, setIsAbortError] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  // Idempotent — safe to call multiple times in any order.
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (mode: "environment" | "user") => {
      stopStream();
      setReady(false);
      setError(null);
      setIsPermissionError(false);
      setIsAbortError(false);
      setCaptureError(null);
      CameraLog.cameraRequested();

      /**
       * Only mark the camera as ready after we confirm there is an actual video
       * frame: readyState >= HAVE_CURRENT_DATA (2) AND non-zero dimensions.
       * video.play() resolving does NOT guarantee a frame exists yet — on slow
       * devices / Chrome Android the video can be black for 200–500 ms after
       * play() resolves.  We use a requestAnimationFrame loop so the check runs
       * per-frame without blocking the main thread.
       */
      const attachStream = (stream: MediaStream) => {
        streamRef.current = stream;
        CameraLog.streamStarted(mode);
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;

        let rafId = 0;

        const poll = () => {
          // Bail out if the stream was stopped while we were waiting
          if (!streamRef.current) return;
          const v = videoRef.current;
          if (
            v &&
            v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            v.videoWidth > 0 &&
            v.videoHeight > 0
          ) {
            CameraLog.cameraReady(v.videoWidth, v.videoHeight);
            setReady(true);
          } else {
            rafId = requestAnimationFrame(poll);
          }
        };

        const kickPoll = () => {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(poll);
        };

        // These events can fire before or after play() resolves — each one
        // kicks the readiness poll so we don't miss the earliest opportunity.
        video.addEventListener("canplay", kickPoll, { once: true });
        video.addEventListener("loadeddata", kickPoll, { once: true });

        const p = video.play();
        if (p !== undefined) {
          p.then(kickPoll).catch(() => {
            // play() can reject if srcObject changed during the promise; if
            // the stream is still active we can still get frames.
            if (streamRef.current?.active) kickPoll();
          });
        } else {
          kickPoll();
        }
      };

      const applyError = (name: string) => {
        const { message, isPermission, isAbort } = getErrorMeta(name);
        setError(message);
        setIsPermissionError(isPermission);
        setIsAbortError(isAbort);
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
        const name = (firstErr as Error).name;
        // Fatal errors where retrying without the facingMode hint won't help
        if (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          name === "SecurityError" ||
          name === "NotFoundError" ||
          name === "DevicesNotFoundError" ||
          name === "NotReadableError" ||
          name === "TrackStartError" ||
          name === "AbortError"
        ) {
          applyError(name);
          return;
        }
        // OverconstrainedError or unknown — retry without facingMode constraint
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          attachStream(stream);
        } catch (secondErr) {
          applyError((secondErr as Error).name);
        }
      }
    },
    [stopStream],
  );

  useEffect(() => {
    startStream("environment");
    return stopStream;
  }, [startStream, stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    setCaptureError(null);
    CameraLog.captureStarted();

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
        // null or zero-byte blob means canvas draw failed (memory pressure, etc.)
        // Show an in-modal error and let the user retry — do NOT call onCapture.
        if (!blob || blob.size === 0) {
          setCaptureError("הצילום נכשל — נסה שוב");
          return;
        }
        CameraLog.blobCreated(blob.size, blob.type);
        stopStream();
        onCapture(blob);
      },
      "image/jpeg",
      0.82,
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
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          paddingBottom: "12px",
        }}
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

            {isPermissionError ? (
              <>
                <p className="text-sm leading-relaxed text-white/70">
                  כדי לאפשר מצלמה בדפדפן:{"\n"}
                  הגדרות אנדרואיד ← אפליקציות ← Chrome ← הרשאות ← מצלמה ← אפשר
                </p>
                <button
                  type="button"
                  onClick={onFallback}
                  className="rounded-2xl bg-white px-8 py-3 text-sm font-bold text-black"
                >
                  צלם עם מצלמת הטלפון במקום
                </button>
              </>
            ) : isAbortError ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startStream(facing)}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black"
                >
                  נסה שוב
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl bg-white/20 px-6 py-3 text-sm font-bold text-white"
                >
                  סגור
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onFallback}
                className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-black"
              >
                צלם עם מצלמת הטלפון במקום
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="flex flex-col items-center bg-black px-10"
        style={{
          paddingTop: "24px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
        }}
      >
        {captureError && (
          <p className="mb-4 text-sm font-medium text-red-400">{captureError}</p>
        )}

        <div className="flex w-full items-center justify-between">
          {/* Flip camera */}
          <button
            type="button"
            onClick={toggleFacing}
            aria-label="החלף מצלמה"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <RotateCcw className="h-6 w-6" />
          </button>

          {/* Shutter — disabled until we have a confirmed video frame */}
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
    </div>
  );
}
