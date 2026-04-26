import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, X, SwitchCamera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraViewfinderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  label: string;
}

const JPEG_QUALITY = 0.85;

export function CameraViewfinder({ onCapture, onClose, label }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (err) {
      console.error("[CameraViewfinder] getUserMedia error", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("הגישה למצלמה נדחתה. אנא אשר הרשאות בהגדרות הדפדפן.");
      } else {
        setError("לא ניתן לפתוח את המצלמה. נסה שוב.");
      }
    }
  }, [stopStream]);

  // Lock body scroll when camera is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    void startCamera(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          stopStream();
          onCapture(blob);
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }, [onCapture, stopStream]);

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  const content = (
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{ zIndex: 99999 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80" style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}>
        <button type="button" onClick={handleClose} className="text-white p-2 rounded-full active:bg-white/20">
          <X className="h-7 w-7" />
        </button>
        <span className="text-white text-sm font-bold truncate max-w-[60%]">{label}</span>
        <button type="button" onClick={handleFlip} className="text-white p-2 rounded-full active:bg-white/20">
          <SwitchCamera className="h-7 w-7" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-white text-base">{error}</p>
          </div>
        ) : !ready ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        ) : null}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            (!ready || error) && "invisible"
          )}
        />
      </div>

      {/* Capture button */}
      <div className="flex items-center justify-center py-8 bg-black/80" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 2rem)" }}>
        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready}
          className={cn(
            "h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
            ready
              ? "bg-white/20 active:bg-white/50 active:scale-90"
              : "opacity-40 cursor-not-allowed"
          )}
        >
          <div className="h-14 w-14 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}