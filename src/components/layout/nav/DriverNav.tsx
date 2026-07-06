import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Sparkles, Home, FileText, MapPin, FolderOpen,
  AlertTriangle, Video, BookOpen, ClipboardList, ShieldAlert, Bell,
} from "lucide-react";

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
    { to: "/my-warnings", icon: ShieldAlert, label: "האזהרות שלי" },
    { to: "/notification-settings", icon: Bell, label: "הגדרות התראות" },
  ];
  if (userType === 'battalion' || isBattalionAdmin) {
    const allowed = ['/', '/drill-locations', '/safety-files', '/safety-events', '/training-videos', '/notification-settings'];
    return items.filter(item => allowed.includes(item.to));
  }
  return items;
};

interface Props {
  onClose: () => void;
  userDepartment: string | null;
}

export function DriverNav({ onClose, userDepartment }: Props) {
  const { userType, isBattalionAdmin, isSuperAdmin, isDivisionUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { activeBrigade } = useAuth() as any;
  const location = useLocation();

  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext;
  const isInDivisionView = isDivisionUser && !activeBrigade && !isOnDepartmentSelector;
  const showDriverNavItems =
    !isInBattalionContext &&
    !(isSuperAdmin && isOnDepartmentSelector) && !isInDivisionView &&
    (!isDivisionUser || !!activeBrigade);

  if (!showDriverNavItems) return null;

  const navItems = getNavItems(userType, isBattalionAdmin);

  return (
    <>
      {navItems.map((item, index) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClose}
          className={cn(
            "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all duration-500 relative overflow-hidden group border border-slate-700/50",
            "hover:bg-gradient-to-l hover:from-primary/20 hover:to-transparent hover:border-primary/50",
            "animate-slide-up opacity-0"
          )}
          style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
          activeClassName="bg-gradient-to-l from-primary/30 to-transparent text-primary border-primary/60 shadow-lg shadow-primary/20"
        >
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
    </>
  );
}
