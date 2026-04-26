import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern - Static for stability */}
      <div className="fixed inset-0 pointer-events-none hero-pattern" />
      
      {/* Static Gradient Blobs - Removed animations to prevent layout jumps */}
      <div className="fixed top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-48 md:w-72 h-48 md:h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/3 to-accent/3 rounded-full blur-3xl pointer-events-none" />

      <MobileNav />
      <main className="pt-16 pb-8 relative z-10 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}