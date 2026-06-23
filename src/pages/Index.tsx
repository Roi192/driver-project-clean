import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { CommanderDashboard } from "@/components/commander/CommanderDashboard";
import { DivisionDashboard } from "@/components/division/DivisionDashboard";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { DriverHomeContent } from "@/components/home/DriverHomeContent";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, isAdmin, isPlatoonCommander, isBattalionAdmin, isSuperAdmin, loading, role, isBattalion, activeBrigade, realIsDivisionAdmin, isDivisionUser } = useAuth() as any;
  const navigate = useNavigate();
  const location = useLocation();
  const [departmentChecked, setDepartmentChecked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const isRootPath = location.pathname === '/';

  // Redirect unauthenticated users to their department's auth page (from PWA install)
  useEffect(() => {
    if (!loading && !user && isRootPath) {
      const dept = localStorage.getItem("install_department");
      if (dept === "battalion") {
        navigate('/auth/gdud', { replace: true });
        return;
      }
      if (dept === "hagmar") {
        navigate('/auth/hagmar', { replace: true });
        return;
      }
      if (dept === "drivers") {
        navigate('/auth', { replace: true });
        return;
      }
    }
  }, [loading, user, isRootPath, navigate]);

  // Reset departmentChecked when user changes
  useEffect(() => {
    setDepartmentChecked(false);
    setIsRedirecting(false);
  }, [user]);

  useEffect(() => {
    const checkDepartment = async () => {
      if (!user || !isRootPath) { setDepartmentChecked(true); return; }
      if (role === null) return;
      
      if (isSuperAdmin) {
        const deptCtx = sessionStorage.getItem('superAdminDeptContext');
        if (!deptCtx) {
          setIsRedirecting(true);
          navigate('/department-selector', { replace: true });
          return;
        }
        const picked = sessionStorage.getItem('superAdminBrigadePicked') === '1';
        if (deptCtx === 'planag' && !activeBrigade && !picked) {
          setIsRedirecting(true);
          navigate('/brigade-context', { replace: true });
          return;
        }
        // otherwise fall through and render the dashboard
      }
      if (role === 'hagmar_admin' || role === 'ravshatz') {
        setIsRedirecting(true);
        navigate('/hagmar', { replace: true });
        return;
      }

      // Battalion users must pick a brigade context before seeing the dashboard
      if (isBattalion && !activeBrigade) {
        setIsRedirecting(true);
        navigate('/brigade-context', { replace: true });
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('department')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.department === 'hagmar') {
        setIsRedirecting(true);
        navigate('/hagmar', { replace: true });
        return;
      }
      
      setDepartmentChecked(true);
    };
    
    if (!loading && user) checkDepartment();
    else if (!loading) setDepartmentChecked(true);
  }, [user, isSuperAdmin, role, loading, navigate, isRootPath, activeBrigade, isBattalion]);

  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin || (realIsDivisionAdmin && !!activeBrigade);
  const inDivisionView = isDivisionUser && !activeBrigade;

  if (loading || !departmentChecked || isRedirecting) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (user && inDivisionView) {
    return (
      <AppLayout>
        <DivisionDashboard />
      </AppLayout>
    );
  }

  if (user && hasAdminAccess) {
    return (
      <AppLayout>
        <CommanderDashboard />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <HeroSection />
      {user && <DriverHomeContent />}
      <QuickActions />
      {user && (
        <div className="px-4 pb-4">
          <PWAInstallButton />
        </div>
      )}
    </AppLayout>
  );
};

export default Index;