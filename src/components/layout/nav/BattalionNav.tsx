import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import { Home, Map, MapPin, FolderOpen, AlertTriangle, Video, ClipboardCheck, Package, UserCog } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function BattalionNav({ onClose }: Props) {
  const { isAdmin, isPlatoonCommander, isBattalionAdmin, isSuperAdmin, isDivisionUser, userType } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { realIsDivisionAdmin, activeBrigade } = useAuth() as any;
  const location = useLocation();

  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext;
  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin || (realIsDivisionAdmin && !!activeBrigade);
  const showBattalionMenu = isInBattalionContext && !isOnDepartmentSelector;
  const showBattalionNonAdminItem = userType === 'battalion' && !hasAdminAccess && !isDivisionUser;

  if (!showBattalionMenu && !showBattalionNonAdminItem) return null;

  if (showBattalionNonAdminItem) {
    return <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="gold" onClose={onClose} />;
  }

  return (
    <>
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
      {isSuperAdmin && <NavMenuItem to="/battalion-users-management" label="ניהול משתמשים" icon={UserCog} iconBg="from-pink-500 to-pink-600" theme="gold" onClose={onClose} />}
    </>
  );
}
