import { useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as Window & { MSStream?: unknown }).MSStream;

export function PWAInstallButton() {
  const { canInstall, isInstalled, installApp } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Already installed as PWA — don't show
  if (isInstalled || dismissed) return null;

  // Android/Desktop: only show when Chrome has a real install prompt ready
  if (!IS_IOS && !canInstall) return null;

  const handleInstall = async () => {
    if (IS_IOS) {
      setShowIOSHint(prev => !prev);
      return;
    }
    await installApp();
  };

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
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full hover:bg-muted/60 transition-colors"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* iOS only: show share-sheet hint inline */}
      {showIOSHint && (
        <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold animate-slide-up">
          <Share2 className="w-4 h-4 shrink-0 text-blue-600" />
          <span className="flex-1">
            לחץ על <Share2 className="inline w-3.5 h-3.5 mx-0.5 text-blue-600" /> בתחתית Safari ←
            "הוסף למסך הבית"
          </span>
          <button
            onClick={() => setShowIOSHint(false)}
            className="p-0.5 rounded hover:bg-blue-200 transition-colors shrink-0"
            aria-label="סגור"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
