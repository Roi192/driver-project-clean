import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import { LayoutDashboard, Map, FileText, Gauge, AlertTriangle, UserCog } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function DivisionNav({ onClose }: Props) {
  const { isDivisionUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { realIsDivisionAdmin, activeBrigade } = useAuth() as any;
  const location = useLocation();

  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const isInDivisionView = isDivisionUser && !activeBrigade && !isOnDepartmentSelector;

  if (!isInDivisionView) return null;

  return (
    <>
      <div className="px-2 pt-2 pb-1 text-xs font-black text-amber-500 uppercase tracking-wider">תצוגה אוגדתית</div>
      <NavMenuItem to="/" label="דשבורד אוגדתי" icon={LayoutDashboard} iconBg="from-amber-500 to-orange-600" theme="division" onClose={onClose} />
      <NavMenuItem to="/division/map" label='מפת פלנגים' icon={Map} iconBg="from-emerald-500 to-teal-600" theme="division" onClose={onClose} />
      <NavMenuItem to="/division/brigade-map" label='מפת איו"ש (חטיבתית)' icon={Map} iconBg="from-teal-500 to-cyan-600" theme="division" onClose={onClose} />
      <NavMenuItem to="/division/report" label="דוח אוגדתי מרוכז" icon={FileText} iconBg="from-blue-500 to-indigo-600" theme="division" onClose={onClose} />
      <NavMenuItem to="/division/fitness" label="כשירות נהגים אוגדתית" icon={Gauge} iconBg="from-rose-500 to-red-600" theme="division" onClose={onClose} />
      {realIsDivisionAdmin && <NavMenuItem to="/users-management" label="ניהול משתמשים אוגדתי" icon={UserCog} iconBg="from-purple-500 to-pink-600" theme="division" onClose={onClose} />}
      <NavMenuItem to="/safety-events" label="אירועי בטיחות אוגדתיים" icon={AlertTriangle} iconBg="from-red-500 to-rose-600" theme="division" onClose={onClose} />
    </>
  );
}
