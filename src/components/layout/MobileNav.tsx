import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Menu, X, LogOut, ChevronLeft, Building } from "lucide-react";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import unitLogo from "@/assets/unit-logo.png";
import { BRIGADES, getBrigade, getBrigadeLabel } from "@/lib/brigades";
import { AdminNav } from "./nav/AdminNav";
import { BattalionNav } from "./nav/BattalionNav";
import { DivisionNav } from "./nav/DivisionNav";
import { DriverNav } from "./nav/DriverNav";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { signOut, isSuperAdmin, isBattalionAdmin, isDivisionUser, user, brigade, role } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { realIsDivisionAdmin, activeBrigade, isBattalion } = useAuth() as any;

  const close = () => setIsOpen(false);

  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext;

  const departmentLabel = isOnDepartmentSelector ? 'מנהל ראשי'
    : isInBattalionContext ? 'גדוד תע"ם'
    : (isDivisionUser && !activeBrigade) ? getBrigadeLabel('division')
    : getBrigade(brigade).shortLabel;

  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, department')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.full_name) setUserName(data.full_name);
        else if (user.user_metadata?.full_name) setUserName(user.user_metadata.full_name);
        if (data?.department) setUserDepartment(data.department);
      }
    };
    fetchUserName();
  }, [user]);

  const handleSignOut = async () => {
    close();
    await signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/auth");
  };

  const displayName = userName || "משתמש";
  const firstLetter = displayName.charAt(0);

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 h-header-safe bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 border-b border-gold/30 shadow-2xl will-change-transform transform-gpu">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
        </div>
        <div className="flex items-center justify-between h-16 pt-header-content px-4 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 border border-gold/40 hover:border-gold hover:bg-gold/30 transition-all duration-300 group"
          >
            <div className="absolute inset-0 rounded-xl bg-gold/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
            <div className={cn("transition-all duration-500 ease-out relative z-10", isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100")}>
              {isOpen ? <X className="h-6 w-6 text-gold" /> : <Menu className="h-6 w-6 text-gold" />}
            </div>
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="font-bold text-sm text-white block drop-shadow-lg">{displayName}</span>
              <span className="text-xs bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent font-bold">{departmentLabel}</span>
            </div>
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-br from-gold via-primary to-gold rounded-2xl blur-md opacity-40" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-teal to-primary flex items-center justify-center relative shadow-emblem border-2 border-gold/50">
                <span className="text-lg font-black text-white drop-shadow-lg">{firstLetter}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-md transition-opacity duration-300 will-change-opacity", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={close}
      />

      {/* Drawer */}
      <nav className={cn("fixed top-header-safe right-0 bottom-0 z-40 w-[85%] max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-l-2 border-gold/40 transition-transform duration-300 ease-out overflow-y-auto shadow-2xl will-change-transform transform-gpu pb-safe", isOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none" />
        <div className="absolute top-20 right-10 w-2 h-2 rounded-full bg-gold/40" />
        <div className="absolute top-40 left-8 w-1.5 h-1.5 rounded-full bg-primary/40" />
        <div className="absolute top-60 right-20 w-1 h-1 rounded-full bg-gold/30" />

        {/* User header */}
        <div className="p-5 border-b border-gold/30 bg-gradient-to-l from-gold/10 via-transparent to-primary/10 relative">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-br from-gold via-primary to-gold rounded-2xl blur-lg opacity-40" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-teal to-primary flex items-center justify-center relative shadow-emblem border-2 border-gold/50">
                <span className="text-xl font-black text-white drop-shadow-lg">{firstLetter}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">שלום,</p>
              <p className="font-black text-lg text-white">{displayName}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white bg-red-500/10 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 border border-red-500/30 hover:border-transparent hover:shadow-lg hover:shadow-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">יציאה</span>
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="p-4 flex justify-center">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-4 bg-gradient-to-br from-gold via-primary to-gold rounded-full blur-2xl opacity-30" />
            <div className="absolute -inset-2 bg-gradient-to-br from-primary to-gold rounded-full blur-xl opacity-20" />
            <img src={unitLogo} alt="סמל הפלוגה" className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl" />
          </div>
        </div>

        <div className="p-4 space-y-2 relative z-10">
          {/* Switch dept button — super admin only, when not on dept selector */}
          {isSuperAdmin && !isOnDepartmentSelector && (
            <NavLink
              to="/department-selector"
              onClick={() => { sessionStorage.removeItem('superAdminDeptContext'); close(); }}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border-2 border-amber-500/40",
                "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
              )}
              activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <span className="font-bold text-base block">החלפת מחלקה</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
            </NavLink>
          )}

          {/* Switch brigade button — division admin or battalion, not on dept selector */}
          {(realIsDivisionAdmin || isBattalion) && !isOnDepartmentSelector && (
            <NavLink
              to="/brigade-context"
              onClick={close}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border-2 border-primary/40",
                "hover:bg-gradient-to-l hover:from-primary/20 hover:to-transparent hover:border-primary/60"
              )}
              activeClassName="bg-gradient-to-l from-primary/30 to-transparent text-primary border-primary/60"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Building className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <span className="font-bold text-base block">החלפת חטיבה</span>
                <span className="text-xs text-slate-400">
                  {activeBrigade ? `כעת: ${(BRIGADES as any)[activeBrigade]?.name || activeBrigade}` : 'כעת: כל החטיבות'}
                </span>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
            </NavLink>
          )}

          <DivisionNav onClose={close} />
          <BattalionNav onClose={close} />
          <AdminNav onClose={close} />
          <DriverNav onClose={close} userDepartment={userDepartment} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gold/20 mt-4 relative z-10">
          <PWAInstallButton />
          <div className="text-center mt-4">
            <p className="text-sm font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">נהג מוביל - פלוגה מנצחת</p>
            <p className="text-xs text-slate-500 mt-1">© פלנ"ג בנימין</p>
          </div>
        </div>
        <div className="h-20" />
      </nav>

      <div className="h-16" />
    </>
  );
}
