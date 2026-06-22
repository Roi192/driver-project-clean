import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import {
  Home, Users, Map, Building, Crosshair, Target, Package, AlertTriangle,
  Siren, Gamepad2, Award, FileCheck, Search, FolderArchive, LayoutDashboard,
  Shield, UserCog,
} from "lucide-react";

interface Props {
  onClose: () => void;
  userDepartment: string | null;
}

export function HagmarNav({ onClose, userDepartment }: Props) {
  const { isHagmarAdmin, isSuperAdmin, role } = useAuth();
  const location = useLocation();

  const isInHagmar = location.pathname.startsWith('/hagmar');
  const isHagmarFighter = userDepartment === 'hagmar' && !isHagmarAdmin && !isSuperAdmin && role !== 'ravshatz';
  const showHagmarMenu = isInHagmar && (isSuperAdmin || isHagmarAdmin || role === 'ravshatz');

  if (!showHagmarMenu && !isHagmarFighter) return null;

  if (isHagmarFighter) {
    return (
      <>
        <NavMenuItem to="/hagmar" label="דף הבית" icon={Home} iconBg="from-amber-500 to-orange-500" theme="amber" onClose={onClose} />
        <NavMenuItem to="/hagmar/weapon-holders" label="מעקב אוחזי נשק" icon={Shield} iconBg="from-amber-500 to-orange-500" theme="amber" onClose={onClose} />
      </>
    );
  }

  return (
    <>
      <NavMenuItem to="/hagmar" label='דף הבית הגמ"ר' icon={Home} iconBg="from-amber-500 to-orange-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/users-management" label="ניהול משתמשים" icon={UserCog} iconBg="from-pink-500 to-pink-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/map" label="מפה חטיבתית" icon={Map} iconBg="from-cyan-600 to-blue-700" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/settlement-card" label="כרטיס יישוב" icon={Building} iconBg="from-slate-700 to-slate-900" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/soldiers" label='לוחמי הגמ"ר' icon={Users} iconBg="from-emerald-500 to-teal-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/weapon-holders" label="מעקב אוחזי נשק" icon={Crosshair} iconBg="from-amber-500 to-orange-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/training-events" label="אירועי אימונים" icon={Target} iconBg="from-blue-500 to-indigo-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/equipment" label="ניהול ציוד" icon={Package} iconBg="from-purple-500 to-indigo-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/security-incidents" label="אירועים ביטחוניים" icon={AlertTriangle} iconBg="from-red-500 to-rose-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/shooting-ranges" label="מטווחים" icon={Crosshair} iconBg="from-orange-500 to-red-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/settlement-drills" label="תרגילי יישוב" icon={Siren} iconBg="from-cyan-500 to-teal-500" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/simulator-training" label="אימוני סימולטור" icon={Gamepad2} iconBg="from-violet-500 to-purple-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/professional-dev" label='השתלמויות רבש"צ' icon={Award} iconBg="from-lime-500 to-green-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/weapon-authorizations" label="הרשאות נשק" icon={FileCheck} iconBg="from-yellow-500 to-amber-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/safety-investigations" label="חקירות בטיחות" icon={Search} iconBg="from-rose-500 to-pink-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/amlach" label='אמל"ח יישובים' icon={Package} iconBg="from-sky-500 to-blue-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/security-components" label="מרכיבי ביטחון" icon={Building} iconBg="from-slate-500 to-gray-600" theme="amber" onClose={onClose} />
      <NavMenuItem to="/hagmar/defense-files" label="תיקי הגנה" icon={FolderArchive} iconBg="from-indigo-500 to-indigo-600" theme="amber" onClose={onClose} />
      {(isHagmarAdmin || isSuperAdmin) && (
        <NavMenuItem to="/hagmar/dashboard" label="דשבורד מנהל" icon={LayoutDashboard} iconBg="from-gold via-gold-dark to-gold" iconColor="text-slate-900" theme="gold" onClose={onClose} />
      )}
    </>
  );
}
