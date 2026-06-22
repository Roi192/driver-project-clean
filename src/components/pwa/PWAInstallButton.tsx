import { useState, useEffect } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    const days = (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    if (ios) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="mt-4 w-full relative">
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
      </div>

      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Smartphone className="w-5 h-5 text-primary" />
              הוסף למסך הבית
            </DialogTitle>
            <DialogDescription className="text-right">
              שלבים להוספת האפליקציה ב-iPhone / iPad
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-sm">1</div>
              <div className="text-right">
                <p className="text-sm font-semibold">לחץ על כפתור השיתוף</p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <span className="text-xs text-muted-foreground">הסמל</span>
                  <Share className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">בתחתית הדפדפן</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-sm">2</div>
              <div className="text-right">
                <p className="text-sm font-semibold">בחר "הוסף למסך הבית"</p>
                <p className="text-xs text-muted-foreground mt-0.5">גלול בתפריט ומצא את האפשרות</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-sm">3</div>
              <div className="text-right">
                <p className="text-sm font-semibold">לחץ "הוסף" בפינה הימנית</p>
                <p className="text-xs text-muted-foreground mt-0.5">האפליקציה תופיע על המסך</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
