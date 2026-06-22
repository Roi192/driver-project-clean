import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EmergencyModeProvider } from "@/hooks/useEmergencyMode";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AppRoutes } from "@/router";
import { toast } from "sonner";

const queryClient = new QueryClient();

function SWUpdateListener() {
  useEffect(() => {
    const handleUpdate = () => {
      let autoReloadTimer: ReturnType<typeof setTimeout> | null = null;

      toast("עדכון זמין", {
        description: "גרסה חדשה של האפליקציה מוכנה",
        duration: 120_000,
        action: {
          label: "עדכן עכשיו",
          onClick: () => {
            if (autoReloadTimer) clearTimeout(autoReloadTimer);
            window.location.reload();
          },
        },
        onDismiss: () => {
          if (autoReloadTimer) clearTimeout(autoReloadTimer);
        },
      });

      autoReloadTimer = setTimeout(() => window.location.reload(), 120_000);
    };

    document.addEventListener("sw-update-available", handleUpdate);
    return () => document.removeEventListener("sw-update-available", handleUpdate);
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EmergencyModeProvider>
          <Toaster />
          <Sonner />
          <SWUpdateListener />
          <InstallPrompt />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </EmergencyModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
