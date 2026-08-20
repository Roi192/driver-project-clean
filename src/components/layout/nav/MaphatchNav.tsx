import { useAuth } from "@/hooks/useAuth";
import { NavMenuItem } from "./NavMenuItem";
import { AlertTriangle, Map, UserCog } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function MaphatchNav({ onClose }: Props) {
  const { role, isSuperAdmin } = useAuth();

  const isMaphatchUser = role === 'maphatch_user' || role === 'maphatch_admin';
  const superAdminMaphatchContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'maphatch';
  const isInMaphatchContext = isMaphatchUser || superAdminMaphatchContext;

  if (!isInMaphatchContext) return null;

  const canManageUsers = role === 'maphatch_admin' || isSuperAdmin;

  return (
    <>
      <NavMenuItem to="/safety-events" label="אירועי בטיחות" icon={AlertTriangle} iconBg="from-red-500 to-rose-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="indigo" onClose={onClose} />
      {canManageUsers && (
        <NavMenuItem to="/maphatch-users" label="ניהול משתמשי מפח&quot;ט" icon={UserCog} iconBg="from-emerald-500 to-teal-600" theme="indigo" onClose={onClose} />
      )}
      {canManageUsers && (
        <NavMenuItem to="/battalion-users-management" label='ניהול משתמשי גדוד תע"ם' icon={UserCog} iconBg="from-indigo-500 to-indigo-700" theme="indigo" onClose={onClose} />
      )}
    </>
  );
}
