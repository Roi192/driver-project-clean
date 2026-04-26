import { Shield, Crown, Sparkles, LogOut, LayoutDashboard, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import unitLogo from "@/assets/unit-logo.png";
import { SmartAlerts } from "./SmartAlerts";
import { KPICards } from "./KPICards";
import { NextUpSection } from "./NextUpSection";
import { CommanderQuickActions } from "./CommanderQuickActions";
import { CleaningParadeCards } from "./CleaningParadeCards";
import { TripFormsCard } from "./TripFormsCard";
import { ProcedureSignaturesComplianceCard } from "./ProcedureSignaturesComplianceCard";
import { TripFormsComplianceCard } from "./TripFormsComplianceCard";

export function CommanderDashboard() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
      {/* Premium Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/8 to-transparent rounded-full blur-[100px] animate-float" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-accent/8 to-transparent rounded-full blur-[100px] animate-float" style={{ animationDuration: '18s', animationDelay: '3s' }} />
        
        {/* Floating Sparkles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${3 + (i % 2)}px`,
              height: `${3 + (i % 2)}px`,
              background: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
              top: `${15 + (i * 12) % 70}%`,
              left: `${5 + (i * 15) % 90}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${6 + (i % 3)}s`,
              opacity: 0.3
            }}
          />
        ))}
      </div>

      <div className="relative px-4 py-6 space-y-6 pb-24">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] animate-slide-up">
          {/* Gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-xl" />

          <div className="relative flex items-center justify-between">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-[-30%] bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" style={{ animationDuration: '3s' }} />
                <img 
                  src={unitLogo} 
                  alt="סמל" 
                  className="relative w-14 h-14 object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div>
                <h1 className="font-black text-xl text-slate-800 flex items-center gap-2">
                  מסך מ"פ
                  <Crown className="w-5 h-5 text-accent animate-pulse" />
                </h1>
                <p className="text-sm text-slate-500">לוח שליטה פיקודי</p>
              </div>
            </div>

            {/* User info */}
            <div className="flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-md opacity-40" />
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                      <span className="text-primary-foreground font-black text-sm">
                        {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={signOut} 
                    className="w-10 h-10 rounded-xl text-slate-500 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Smart Alerts Section */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <SmartAlerts />
        </section>

        {/* KPI Cards */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <KPICards />
        </section>

        {/* Cleaning Parade Cards */}
        <section className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <CleaningParadeCards />
        </section>

        {/* Trip Forms Card */}
        <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <TripFormsCard />
        </section>

        {/* Procedure Signatures Compliance Card */}
        <section className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <ProcedureSignaturesComplianceCard />
        </section>

        {/* Trip Forms Compliance Card (based on expected soldiers) */}
        <section className="animate-slide-up" style={{ animationDelay: '0.38s' }}>
          <TripFormsComplianceCard />
        </section>

        {/* Next Up Section */}
        <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <NextUpSection />
        </section>

        {/* Quick Actions */}
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CommanderQuickActions />
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-primary/50" />
            <Shield className="w-5 h-5 text-primary/50" />
            <div className="w-10 h-0.5 bg-gradient-to-l from-transparent via-accent/30 to-accent/50" />
          </div>
          <p className="text-sm font-bold text-slate-400">פלנ"ג בנימין • מערכת נהגי בט"ש</p>
        </footer>
      </div>
    </div>
  );
}