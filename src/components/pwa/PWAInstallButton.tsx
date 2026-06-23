import { useState, useEffect } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-btn-dismissed";
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24) < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);
    setVisible(true);

    if (ios) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold text-foreground">הוסף למסך הבית</p>
          <p className="text-xs text-muted-foreground">גישה מהירה בלי דפדפן</p>
        </div>
        <Button size="sm" onClick={handleInstall} className="h-8 px-3 text-xs font-bold">
          <Download className="w-3.5 h-3.5 ml-1" />
          התקן
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-muted/60 transition-colors"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* iOS hint banner — appears below the button */}
      {showIOSHint && (
        <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold animate-slide-up">
          <Share2 className="w-5 h-5 shrink-0 text-blue-600" />
          <span>לחץ על <Share2 className="inline w-4 h-4 mx-0.5" /> בתחתית הדפדפן ← "הוסף למסך הבית"</span>
          <button
            onClick={() => setShowIOSHint(false)}
            className="mr-auto p-0.5 rounded hover:bg-blue-200 transition-colors"
            aria-label="סגור"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
