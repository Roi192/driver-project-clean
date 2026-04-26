import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS prompt after delay if not installed
    if (ios && !standalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // Check if dismissed recently
  const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) return null;
  }

  if (!showPrompt) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50",
      "bg-card/95 backdrop-blur-xl border border-border",
      "rounded-2xl shadow-2xl p-4",
      "animate-in slide-in-from-bottom-4 duration-500"
    )}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
          <Smartphone className="w-7 h-7 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground mb-1">
            התקן את האפליקציה
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            גישה מהירה מהמסך הראשי - בלי להיכנס לדפדפן
          </p>

          {isIOS ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
              <Share className="w-4 h-4" />
              <span>לחץ על</span>
              <span className="font-semibold">שיתוף</span>
              <span>ואז</span>
              <span className="font-semibold">"הוסף למסך הבית"</span>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Download className="w-4 h-4 ml-2" />
              התקן עכשיו
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}