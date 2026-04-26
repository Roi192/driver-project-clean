import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { 
  Home, 
  FileText, 
  MapPin, 
  FolderOpen, 
  AlertTriangle, 
  Video, 
  BookOpen, 
  ClipboardList,
  Menu,
  X,
  Sparkles,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  Calendar,
  ClipboardCheck,
  Users,
  Gavel,
  UserCheck,
  FileSearch,
  Car,
  Map,
  UserCog,
  Gauge,
  GraduationCap,
  CalendarDays,
  Crosshair,
  Target,
  Package,
  Shield,
  FileCheck,
  Siren,
  Gamepad2,
  Award,
  Search,
  Building,
  FolderArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import unitLogo from "@/assets/unit-logo.png";

// Base nav items - shift-form will be filtered based on user type
const getNavItems = (userType: string | null, isBattalionAdmin: boolean) => {
  const items = [
    { to: "/", icon: Home, label: "דף הבית" },
    { to: "/shift-form", icon: FileText, label: "טופס לפני משמרת", featured: true },
    { to: "/trip-form", icon: Home, label: "טופס טיולים לפני יציאה" },
    { to: "/cleaning-parades", icon: Sparkles, label: "מסדרי ניקיון" },
    { to: "/drill-locations", icon: MapPin, label: "נקודות תרגולות" },
    { to: "/safety-files", icon: FolderOpen, label: "תיקי בטיחות" },
    { to: "/safety-events", icon: AlertTriangle, label: "אירועי בטיחות" },
    { to: "/training-videos", icon: Video, label: "סרטוני הדרכה" },
    { to: "/procedures", icon: BookOpen, label: "נהלים" },
    { to: "/my-reports", icon: ClipboardList, label: "הדיווחים שלי" },
  ];
  
  // For battalion users, only show: home, drill-locations, safety-files, safety-events, training-videos
  if (userType === 'battalion' || isBattalionAdmin) {
    const allowedBattalionPaths = ['/', '/drill-locations', '/safety-files', '/safety-events', '/training-videos'];
    return items.filter(item => allowedBattalionPaths.includes(item.to));
  }
  
  return items;
};

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const location = useLocation();
  const isInHagmar = location.pathname.startsWith('/hagmar');
  const { 
    signOut, 
    isAdmin, 
    isPlatoonCommander, 
    isBattalionAdmin,
    isSuperAdmin,
    isHagmarAdmin,
    user, 
    userType,
    role,
    canAccessUsersManagement,
    canAccessBomReport,
    canAccessAnnualWorkPlan,
    canAccessSoldiersControl,
    canAccessAttendance,
    canAccessPunishments,
    canAccessInspections,
    canAccessHolidays,
    canAccessFitnessReport,
    canAccessAccidents,
    canAccessCourses,
    canAccessCleaningManagement,
    canAccessSafetyScores,
    canAccessDriverInterviews,
    canAccessWorkSchedule,
    canAccessWeeklyMeeting,
    canAccessEquipmentTracking,
  } = useAuth();
  const navigate = useNavigate();
  
  const navItems = getNavItems(userType, isBattalionAdmin);

  // Battalion context detection
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext;

  // Check if user has any admin-level role
  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin;
  
  // Check if super_admin is on the department selector (neutral context)
  const isOnDepartmentSelector = location.pathname === '/department-selector';
  
  // Detect HAGMAR fighters (role=driver but department=hagmar)
  const isHagmarFighter = userDepartment === 'hagmar' && !isHagmarAdmin && !isSuperAdmin && role !== 'ravshatz';
  // Check if currently in HAGMAR department context
  const showHagmarMenu = isInHagmar && (isSuperAdmin || isHagmarAdmin || role === 'ravshatz');
  // Show minimal hagmar menu for fighters
  const showHagmarFighterMenu = isHagmarFighter;
  // Only show planag menu when NOT in hagmar AND NOT on department selector (for super_admin) AND NOT a hagmar fighter AND NOT in battalion context
  const showPlanagMenu = !isInHagmar && !isHagmarFighter && !isInBattalionContext && !(isSuperAdmin && isOnDepartmentSelector);
  // Show battalion menu when in battalion context
  const showBattalionMenu = isInBattalionContext && !isOnDepartmentSelector;
  // Hide driver nav items when in hagmar OR when super_admin is on department selector OR hagmar fighter OR battalion context
  const showDriverNavItems = !showHagmarMenu && !showHagmarFighterMenu && !isInBattalionContext && !(isSuperAdmin && isOnDepartmentSelector);
  
  // Department label for header
  const departmentLabel = isOnDepartmentSelector ? 'מנהל ראשי' : (isInHagmar || isHagmarFighter) ? 'הגמ"ר' : isInBattalionContext ? 'גדוד תע"ם' : 'פלנ"ג בנימין';

  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, department')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.full_name) {
          setUserName(data.full_name);
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        }
        if (data?.department) {
          setUserDepartment(data.department);
        }
      }
    };
    fetchUserName();
  }, [user]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/auth");
  };

  const displayName = userName || "משתמש";
  const firstLetter = displayName.charAt(0);

  return (
    <>
      {/* Header - Premium Dark Style */}
      <header className="fixed top-0 right-0 left-0 z-50 h-16 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 border-b border-gold/30 shadow-2xl will-change-transform transform-gpu">
        {/* Static shine effect - removed animation to prevent flickering */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
        </div>
        
        <div className="flex items-center justify-between h-full px-4 relative z-10">
          {/* Menu Button - Now with vibrant gold styling */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 border border-gold/40 hover:border-gold hover:bg-gold/30 transition-all duration-300 group"
          >
            <div className="absolute inset-0 rounded-xl bg-gold/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
            <div className={cn(
              "transition-all duration-500 ease-out relative z-10",
              isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100"
            )}>
              {isOpen ? (
                <X className="h-6 w-6 text-gold" />
              ) : (
                <Menu className="h-6 w-6 text-gold" />
              )}
            </div>
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="font-bold text-sm text-white block drop-shadow-lg">{displayName}</span>
              <span className="text-xs bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent font-bold">{departmentLabel}</span>
            </div>
            <div className="relative flex-shrink-0">
              {/* Static glow ring - removed animation */}
              <div className="absolute -inset-1 bg-gradient-to-br from-gold via-primary to-gold rounded-2xl blur-md opacity-40" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-teal to-primary flex items-center justify-center relative shadow-emblem border-2 border-gold/50">
                <span className="text-lg font-black text-white drop-shadow-lg">{firstLetter}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-md transition-opacity duration-300 will-change-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu - Dark Premium Style */}
      <nav
        className={cn(
          "fixed top-16 right-0 bottom-0 z-40 w-[85%] max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-l-2 border-gold/40 transition-transform duration-300 ease-out overflow-y-auto shadow-2xl will-change-transform transform-gpu",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Decorative Background - static */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none" />
        
        {/* Static particles - removed animation */}
        <div className="absolute top-20 right-10 w-2 h-2 rounded-full bg-gold/40" />
        <div className="absolute top-40 left-8 w-1.5 h-1.5 rounded-full bg-primary/40" />
        <div className="absolute top-60 right-20 w-1 h-1 rounded-full bg-gold/30" />
        
        {/* User Info Header - Glowing Premium Style */}
        <div className="p-5 border-b border-gold/30 bg-gradient-to-l from-gold/10 via-transparent to-primary/10 relative">
          <div className="flex items-center gap-4">
            {/* User Avatar - static glow */}
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

        {/* Unit Logo Section - Enhanced */}
        <div className="p-4 flex justify-center">
          <div className="relative flex-shrink-0">
            {/* Static glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-gold via-primary to-gold rounded-full blur-2xl opacity-30" />
            <div className="absolute -inset-2 bg-gradient-to-br from-primary to-gold rounded-full blur-xl opacity-20" />
            <img 
              src={unitLogo} 
              alt="סמל הפלוגה" 
              className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="p-4 space-y-2 relative z-10">
          {/* Super Admin Menu - shown on department selector */}
          {isSuperAdmin && isOnDepartmentSelector && (
            <>
              <NavLink
                to="/department-selector"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Home className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דף הבית</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/super-admin-dashboard"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gold via-gold-dark to-gold text-slate-900 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דשבורד מנהל ראשי</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-gold group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>
            </>
          )}

          {/* Switch Department Button - shown when inside a department */}
          {isSuperAdmin && !isOnDepartmentSelector && (
            <NavLink
              to="/department-selector"
              onClick={() => { sessionStorage.removeItem('superAdminDeptContext'); setIsOpen(false); }}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border-2 border-amber-500/40",
                "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
              )}
              activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Home className="w-6 h-6" />
              </div>
              <span className="font-bold text-base relative z-10 flex-1">החלפת מחלקה</span>
              <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
            </NavLink>
          )}

          {/* Battalion Menu - shown for battalion_admin or super_admin in battalion context */}
          {showBattalionMenu && (
            <>
              <NavLink to="/" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Home className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דף הבית</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/know-the-area" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Map className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">הכר את הגזרה</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/drill-locations" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">נקודות תרגולות</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/safety-files" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">תיקי בטיחות</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/safety-events" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">אירועי בטיחות</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-red-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/training-videos" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Video className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">סרטוני הדרכה</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              {/* Battalion admin extras: driver interviews + equipment tracking */}
              {(isBattalionAdmin || isSuperAdmin) && (
                <>
                  <NavLink to="/driver-interviews" onClick={() => setIsOpen(false)}
                    className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                    activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-base relative z-10 flex-1">ביצוע ראיון נהג קו</span>
                    <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all duration-300" />
                  </NavLink>

                  <NavLink to="/admin-driver-interviews" onClick={() => setIsOpen(false)}
                    className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                    activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-base relative z-10 flex-1">מעקב ראיונות נהגי קו</span>
                    <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all duration-300" />
                  </NavLink>

                  <NavLink to="/equipment-tracking" onClick={() => setIsOpen(false)}
                    className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60")}
                    activeClassName="bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-base relative z-10 flex-1">מעקב צל"ם</span>
                    <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:-translate-x-1 transition-all duration-300" />
                  </NavLink>
                </>
              )}

              {/* Super admin only: battalion user management */}
              {isSuperAdmin && (
                <NavLink to="/battalion-users-management" onClick={() => setIsOpen(false)}
                  className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60")}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UserCog className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ניהול משתמשים</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}
            </>
          )}

          {/* HAGMAR Menu - shown when in /hagmar routes */}
          {showHagmarMenu && (
            <>
              <NavLink
                to="/hagmar"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Home className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דף הבית הגמ"ר</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/users-management"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <UserCog className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">ניהול משתמשים</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/map"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Map className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מפה חטיבתית</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/settlement-card"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Building className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">כרטיס יישוב</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/soldiers"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">לוחמי הגמ"ר</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/weapon-holders"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Crosshair className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מעקב אוחזי נשק</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/training-events"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">אירועי אימונים</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/equipment"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">ניהול ציוד</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/security-incidents"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">אירועים ביטחוניים</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-red-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/shooting-ranges" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Crosshair className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מטווחים</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-orange-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/settlement-drills" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Siren className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">תרגילי יישוב</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/simulator-training" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">אימוני סימולטור</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/professional-dev" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">השתלמויות רבש"צ</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-lime-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/weapon-authorizations" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileCheck className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">הרשאות נשק</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/safety-investigations" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Search className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">חקירות בטיחות</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/amlach" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">אמל"ח יישובים</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/security-components" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Building className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מרכיבי ביטחון</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-300 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink to="/hagmar/defense-files" onClick={() => setIsOpen(false)}
                className={cn("flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30", "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60")}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">תיקי הגנה</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              {(isHagmarAdmin || isSuperAdmin) && (
                <NavLink
                  to="/hagmar/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gold via-gold-dark to-gold text-slate-900 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">דשבורד מנהל</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-gold group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}
            </>
          )}

          {/* HAGMAR Fighter Menu - minimal: only home + weapon holders */}
          {showHagmarFighterMenu && (
            <>
              <NavLink
                to="/hagmar"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Home className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דף הבית</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              <NavLink
                to="/hagmar/weapon-holders"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60"
                )}
                activeClassName="bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מעקב אוחזי נשק</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>
            </>
          )}

          {hasAdminAccess && showPlanagMenu && (
            <>
              <NavLink
                to="/admin"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                )}
                activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gold via-gold-dark to-gold text-slate-900 shadow-gold group-hover:scale-110 transition-transform duration-300">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">דשבורד מנהל</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-gold group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>

              {/* Annual Work Plan - Admin and Platoon Commander only */}
              {canAccessAnnualWorkPlan && (
                <NavLink
                  to="/annual-work-plan"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">תוכנית עבודה שנתית</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* BOM Report - Admin only */}
              {canAccessBomReport && (
                <NavLink
                  to="/bom-report"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">דו"ח בו"מ</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Soldiers Control - Admin and Platoon Commander only */}
              {canAccessSoldiersControl && (
                <NavLink
                  to="/soldiers-control"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">טבלת שליטה</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Attendance Tracking - Admin and Platoon Commander only */}
              {canAccessAttendance && (
                <NavLink
                  to="/attendance-tracking"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">מעקב נוכחות</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-teal-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Punishments Tracking - Admin and Platoon Commander only */}
              {canAccessPunishments && (
                <NavLink
                  to="/punishments"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Gavel className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">מעקב עונשים</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-red-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Inspections - Admin and Platoon Commander only */}
              {canAccessInspections && (
                <NavLink
                  to="/inspections"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileSearch className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ביקורות</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Safety Scores - Admin and Platoon Commander only */}
              {canAccessSafetyScores && (
                <NavLink
                  to="/safety-scores"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ציוני בטיחות</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {canAccessAccidents && (
              <NavLink
                to="/accidents-tracking"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                )}
                activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Car className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">מעקב תאונות</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-orange-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>
              )}

              <NavLink
                to="/know-the-area"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                )}
                activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Map className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">הכר את הגזרה</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>



              {canAccessUsersManagement && !(role === 'hagmar_admin') && (
                <NavLink
                  to="/users-management"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UserCog className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ניהול משתמשים</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Cleaning Parades Admin - Admin and Platoon Commander only */}
              {canAccessCleaningManagement && (
                <NavLink
                  to="/cleaning-parades-admin"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ניהול מסדרי ניקיון</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Courses Management - Admin and Platoon Commander only */}
              {canAccessCourses && (
                <NavLink
                  to="/courses-management"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ניהול קורסים</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Driver Interviews Admin - Admin and Platoon Commander only */}
              {canAccessDriverInterviews && (
                <NavLink
                  to="/admin-driver-interviews"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">מעקב ראיונות נהגי קו</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Driver Interviews Form - Admin and Platoon Commander only */}
              {canAccessDriverInterviews && (
                <NavLink
                  to="/driver-interviews"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">ביצוע ראיון נהג קו</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Fitness Report - Admin only */}
              {canAccessFitnessReport && (
                <NavLink
                  to="/fitness-report"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileSearch className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">דוח כשירות מרוכז</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-green-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Work Schedule - Admin and Platoon Commander only */}
              {canAccessWorkSchedule && (
                <NavLink
                  to="/work-schedule"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-lime-500 to-lime-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">סידור עבודה</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-lime-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Weekly Meeting - Admin and Platoon Commander only */}
              {canAccessWeeklyMeeting && (
                <NavLink
                  to="/weekly-meeting"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">פתיחת שבוע</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Holidays Management - Admin and Platoon Commander only */}
              {canAccessHolidays && (
                <NavLink
                  to="/holidays-management"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">חגים ואזכורים</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}

              {/* Equipment Tracking - Admin only */}
              {canAccessEquipmentTracking && (
                <NavLink
                  to="/equipment-tracking"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                    "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                  )}
                  activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Crosshair className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base relative z-10 flex-1">מעקב צל"ם</span>
                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:-translate-x-1 transition-all duration-300" />
                </NavLink>
              )}
            </>
          )}

          {/* Links for battalion users ONLY (not admin) - show know-the-area */}
          {userType === 'battalion' && !hasAdminAccess && (
            <>
              <NavLink
                to="/know-the-area"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 relative overflow-hidden group border border-gold/30",
                  "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60"
                )}
                activeClassName="bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Map className="w-6 h-6" />
                </div>
                <span className="font-bold text-base relative z-10 flex-1">הכר את הגזרה</span>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all duration-300" />
              </NavLink>
            </>
          )}

          {showDriverNavItems && navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-500 relative overflow-hidden group border border-slate-700/50",
                "hover:bg-gradient-to-l hover:from-primary/20 hover:to-transparent hover:border-primary/50",
                "animate-slide-up opacity-0"
              )}
              style={{ 
                animationDelay: `${index * 60}ms`,
                animationFillMode: 'forwards'
              }}
              activeClassName="bg-gradient-to-l from-primary/30 to-transparent text-primary border-primary/60 shadow-lg shadow-primary/20"
            >
              {/* Hover Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                item.featured 
                  ? "bg-gradient-to-br from-gold via-gold-dark to-gold text-slate-900 shadow-gold" 
                  : "bg-slate-800 group-hover:bg-primary/30 text-slate-400 group-hover:text-white border border-slate-700 group-hover:border-primary/50"
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              
              <span className="font-bold text-base relative z-10 flex-1">{item.label}</span>
              
              {item.featured ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-gold/30 to-gold/20 text-gold text-xs font-black border border-gold/50 shadow-lg shadow-gold/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  חשוב
                </span>
              ) : (
                <ChevronLeft className="w-5 h-5 text-slate-600 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
              )}
            </NavLink>
          ))}
        </div>

        {/* Menu Footer - Premium */}
        <div className="p-4 border-t border-gold/20 mt-4 relative z-10">
          <div className="text-center">
            <p className="text-sm font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">נהג מוביל - פלוגה מנצחת</p>
            <p className="text-xs text-slate-500 mt-1">© פלנ"ג בנימין</p>
          </div>
        </div>
        
        <div className="h-20" />
      </nav>

      {/* Bottom padding for content */}
      <div className="h-16" />
    </>
  );
}