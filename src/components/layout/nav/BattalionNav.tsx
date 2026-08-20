import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import { Home, Map, MapPin, FolderOpen, AlertTriangle, Video, ClipboardCheck, Package, UserCog, ArrowRight } from "lucide-react";
import { BRIGADE_CTX_KEY } from "./BrigadeNav";

interface Props {
  onClose: () => void;
}

export function BattalionNav({ onClose }: Props) {
  const { isAdmin, isPlatoonCommander, isBattalionAdmin, isSuperAdmin, isDivisionUser, isBrigadeAdmin, userType } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { realIsDivisionAdmin, activeBrigade } = useAuth() as any;
  const location = useLocation();
  const navigate = useNavigate();

  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const brigadeAdminBattalionMode = isBrigadeAdmin && sessionStorage.getItem(BRIGADE_CTX_KEY) === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext || brigadeAdminBattalionMode;
  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin || (realIsDivisionAdmin && !!activeBrigade);
  const showBattalionMenu = isInBattalionContext && !isOnDepartmentSelector;
  const showBattalionNonAdminItem = userType === 'battalion' && !hasAdminAccess && !isDivisionUser;

  if (!showBattalionMenu && !showBattalionNonAdminItem) return null;

  if (showBattalionNonAdminItem) {
    return <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="gold" onClose={onClose} />;
  }

  return (
    <>
      {brigadeAdminBattalionMode && (
        <button
          onClick={() => { sessionStorage.removeItem(BRIGADE_CTX_KEY); navigate('/brigade-dashboard'); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all group border border-indigo-500/40 hover:border-indigo-500/60 hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent mb-2"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-base flex-1 text-right">חזרה לדשבורד חטיבה</span>
        </button>
      )}
      <NavMenuItem to="/" label="דף הבית" icon={Home} iconBg="from-indigo-500 to-blue-600" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/drill-locations" label="נקודות תרגולות" icon={MapPin} iconBg="from-emerald-500 to-teal-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/safety-files" label="תיקי בטיחות" icon={FolderOpen} iconBg="from-amber-500 to-orange-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/safety-events" label="אירועי בטיחות" icon={AlertTriangle} iconBg="from-red-500 to-rose-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/training-videos" label="סרטוני הדרכה" icon={Video} iconBg="from-purple-500 to-violet-500" theme="indigo" onClose={onClose} />
      {(isBattalionAdmin || isSuperAdmin) && (
        <>
          <NavMenuItem to="/driver-interviews" label="ביצוע ראיון נהג קו" icon={ClipboardCheck} iconBg="from-violet-500 to-violet-600" theme="indigo" onClose={onClose} />
          <NavMenuItem to="/admin-driver-interviews" label="מעקב ראיונות נהגי קו" icon={ClipboardCheck} iconBg="from-violet-500 to-violet-600" theme="indigo" onClose={onClose} />
          <NavMenuItem to="/equipment-tracking" label='מעקב צל"ם' icon={Package} iconBg="from-sky-500 to-blue-600" theme="indigo" onClose={onClose} />
        </>
      )}
      {(isSuperAdmin || isAdmin || isBattalionAdmin) && <NavMenuItem to="/battalion-users-management" label='ניהול משתמשי גדוד תע"ם' icon={UserCog} iconBg="from-pink-500 to-pink-600" theme="gold" onClose={onClose} />}
    </>
  );
}
