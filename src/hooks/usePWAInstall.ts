import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

function checkStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Always derive from live browser state — never from localStorage
    const standalone = checkStandalone();
    setIsInstalled(standalone);
    if (standalone) return;

    // Pick up prompt captured before React mounted (index.html inline script)
    if (window.__pwaInstallPrompt) {
      setPrompt(window.__pwaInstallPrompt);
      setCanInstall(true);
      window.__pwaInstallPrompt = null;
    }

    // Also catch prompts that fire after mount
    const promptHandler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', promptHandler);

    // Watch for display-mode changes: detects both install AND uninstall from home screen
    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) setCanInstall(false);
    };
    mq.addEventListener('change', mqHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      mq.removeEventListener('change', mqHandler);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setPrompt(null);
      if (outcome === 'accepted') {
        setCanInstall(false);
        setIsInstalled(true);
      }
    } catch {
      // prompt already consumed or browser denied
    }
  }, [prompt]);

  return { canInstall, isInstalled, installApp };
}
