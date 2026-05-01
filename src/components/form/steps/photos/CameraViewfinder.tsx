import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, SwitchCamera, Loader2, Zap, ZapOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNativePlatform } from "@/lib/capacitor-camera";

interface CameraViewfinderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  label: string;
}

const JPEG_QUALITY = 0.85;

// Brightness threshold (0-255) below which we consider the scene "dark"
const DARK_BRIGHTNESS_THRESHOLD = 55;
const BRIGHTNESS_SAMPLE_INTERVAL_MS = 1500;

export function CameraViewfinder({ onCapture, onClose, label }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAuto, setTorchAuto] = useState(true); // auto-enable torch in dark scenes
  const [isDarkScene, setIsDarkScene] = useState(false);
  const [screenFlashActive, setScreenFlashActive] = useState(false);
  const userOverrodeTorchRef = useRef(false);
  const nativeFlashRef = useRef<null | {
    isAvailable: () => Promise<{ value: boolean }>;
    switchOn: () => Promise<void>;
    switchOff: () => Promise<void>;
  }>(null);
  const isNative = isNativePlatform();

  // Lazy-load the native LED flash plugin (Capgo Flash) when running inside Capacitor
  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@capgo/capacitor-flash");
        if (cancelled) return;
        // Plugin exposes a `Flash` object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Flash = (mod as any).Flash ?? (mod as any).default;
        if (!Flash) return;
        nativeFlashRef.current = Flash;
        try {
          const res = await Flash.isAvailable();
          if (!cancelled && res?.value) setTorchSupported(true);
        } catch (err) {
          console.warn("[CameraViewfinder] native flash isAvailable failed", err);
        }
      } catch (err) {
        console.warn("[CameraViewfinder] native flash plugin not available", err);
      }
    })();
    return () => {
      cancelled = true;
      // Make sure the LED is off when unmounting
      const f = nativeFlashRef.current;
      if (f) {
        f.switchOff().catch(() => {});
      }
    };
  }, [isNative]);

  const applyTorch = useCallback(async (on: boolean) => {
    // Prefer the native LED plugin when running inside Capacitor (works on iOS too)
    const nativeFlash = nativeFlashRef.current;
    if (isNative && nativeFlash) {
      try {
        if (on) await nativeFlash.switchOn();
        else await nativeFlash.switchOff();
        setTorchOn(on);
        return true;
      } catch (err) {
        console.warn("[CameraViewfinder] native torch toggle failed", err);
        // fall through to web API attempt
      }
    }

    const stream = streamRef.current;
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    const capabilities = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities.torch) return false;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet & { torch: boolean }] });
      setTorchOn(on);
      return true;
    } catch (err) {
      console.warn("[CameraViewfinder] torch apply failed", err);
      return false;
    }
  }, [isNative]);

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
    setTorchSupported(false);
    setTorchOn(false);

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

        // Detect torch support on the active video track
        const track = stream.getVideoTracks()[0];
        const capabilities = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        // If native plugin already marked torch as supported, keep it.
        setTorchSupported((prev) => prev || Boolean(capabilities.torch));
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

  // Reset user override when switching cameras
  useEffect(() => {
    userOverrodeTorchRef.current = false;
    setTorchAuto(true);
  }, [facingMode]);

  // Auto-detect dark scene and toggle torch when supported (rear camera only)
  useEffect(() => {
    if (!ready || !torchSupported || facingMode !== "environment") return;

    const video = videoRef.current;
    if (!video) return;

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;

    const sample = () => {
      if (cancelled || userOverrodeTorchRef.current) return;
      try {
        ctx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const { data } = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
        let total = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          // Perceived luminance
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = total / pixels;
        const shouldBeOn = avg < DARK_BRIGHTNESS_THRESHOLD;
        if (shouldBeOn !== torchOn) {
          void applyTorch(shouldBeOn);
        }
      } catch {
        // ignore sampling errors (e.g. video not ready yet)
      }
    };

    // First sample slightly delayed so exposure settles
    const initial = window.setTimeout(sample, 600);
    const interval = window.setInterval(sample, BRIGHTNESS_SAMPLE_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [ready, torchSupported, facingMode, torchOn, applyTorch]);

  // Independent dark-scene detection for the screen-flash fallback
  // (works on iOS Safari where the Web torch API is not supported).
  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    if (!video) return;

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;
    const sample = () => {
      if (cancelled) return;
      try {
        ctx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const { data } = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
        let total = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        setIsDarkScene(total / pixels < DARK_BRIGHTNESS_THRESHOLD);
      } catch {
        // ignore
      }
    };
    const initial = window.setTimeout(sample, 600);
    const interval = window.setInterval(sample, BRIGHTNESS_SAMPLE_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [ready]);

  const performCapture = useCallback(() => {
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

  const handleCapture = useCallback(() => {
    // Hardware torch already on (Android Chrome) → just capture.
    // For iOS Safari / browsers without torch, show a white screen flash to illuminate dark scenes.
    const needScreenFlash = !torchSupported && isDarkScene && facingMode === "environment";
    if (!needScreenFlash) {
      performCapture();
      return;
    }

    setScreenFlashActive(true);
    // Allow ~250ms for the white overlay to actually illuminate the subject before snapping
    window.setTimeout(() => {
      performCapture();
      window.setTimeout(() => setScreenFlashActive(false), 100);
    }, 250);
  }, [performCapture, torchSupported, isDarkScene, facingMode]);

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const handleToggleTorch = useCallback(() => {
    userOverrodeTorchRef.current = true;
    setTorchAuto(false);
    void applyTorch(!torchOn);
  }, [applyTorch, torchOn]);

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
        <span className="text-white text-sm font-bold truncate max-w-[50%]">{label}</span>
        <div className="flex items-center gap-1">
          {torchSupported ? (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={cn(
                "p-2 rounded-full active:bg-white/20 transition-colors",
                torchOn ? "text-yellow-300" : "text-white"
              )}
              aria-label={torchOn ? "כבה פלאש" : "הפעל פלאש"}
              title={torchAuto ? "פלאש אוטומטי" : torchOn ? "פלאש דולק" : "פלאש כבוי"}
            >
              {torchOn ? <Zap className="h-7 w-7" /> : <ZapOff className="h-7 w-7" />}
            </button>
          ) : isDarkScene && facingMode === "environment" ? (
            <span
              className="text-yellow-300 p-2 flex items-center gap-1"
              title="פלאש מסך פעיל - יואר בעת הצילום"
              aria-label="פלאש מסך פעיל"
            >
              <Zap className="h-6 w-6" />
              <span className="text-[10px] font-bold">מסך</span>
            </span>
          ) : null}
          <button type="button" onClick={handleFlip} className="text-white p-2 rounded-full active:bg-white/20">
            <SwitchCamera className="h-7 w-7" />
          </button>
        </div>
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

      {/* Screen-flash overlay (iOS Safari / no-torch fallback for dark scenes) */}
      {screenFlashActive && (
        <div
          className="pointer-events-none fixed inset-0 bg-white"
          style={{ zIndex: 100000 }}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
}