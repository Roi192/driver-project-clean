import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import { AlertTriangle, Map, UserCog, ArrowRight } from "lucide-react";
import { BRIGADE_CTX_KEY } from "./BrigadeNav";

interface Props {
  onClose: () => void;
}

export function MaphatchNav({ onClose }: Props) {
  const { role, isSuperAdmin, isBrigadeAdmin } = useAuth();
  const navigate = useNavigate();

  const isMaphatchUser = role === 'maphatch_user' || role === 'maphatch_admin';
  const superAdminMaphatchContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'maphatch';
  const brigadeAdminMaphatchMode = isBrigadeAdmin && sessionStorage.getItem(BRIGADE_CTX_KEY) === 'maphatch';
  const isInMaphatchContext = isMaphatchUser || superAdminMaphatchContext || brigadeAdminMaphatchMode;

  if (!isInMaphatchContext) return null;

  const canManageUsers = role === 'maphatch_admin' || isSuperAdmin || isBrigadeAdmin;

  return (
    <>
      {brigadeAdminMaphatchMode && (
        <button
          onClick={() => {
            sessionStorage.removeItem(BRIGADE_CTX_KEY);
            sessionStorage.removeItem('maphatchDeptContext');
            navigate('/brigade-dashboard');
            onClose();
          }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white transition-all group border border-emerald-500/40 hover:border-emerald-500/60 hover:bg-gradient-to-l hover:from-emerald-500/20 hover:to-transparent mb-2"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-base flex-1 text-right">חזרה לדשבורד חטיבה</span>
        </button>
      )}
      {brigadeAdminMaphatchMode && (
        <NavMenuItem to="/maphatch-dept-selector" label='החלפת אגף מפח"ט' icon={Map} iconBg="from-emerald-500 to-teal-600" theme="indigo" onClose={onClose} />
      )}
      <NavMenuItem to="/safety-events" label="אירועי בטיחות" icon={AlertTriangle} iconBg="from-red-500 to-rose-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="indigo" onClose={onClose} />
      {canManageUsers && (
        <NavMenuItem to="/maphatch-users" label='ניהול משתמשי מפח"ט' icon={UserCog} iconBg="from-emerald-500 to-teal-600" theme="indigo" onClose={onClose} />
      )}
      {canManageUsers && (
        <NavMenuItem to="/battalion-users-management" label='ניהול משתמשי גדוד תע"ם' icon={UserCog} iconBg="from-indigo-500 to-indigo-700" theme="indigo" onClose={onClose} />
      )}
    </>
  );
}
