import { useAuth } from "@/hooks/useAuth";
import { NavMenuItem } from "./NavMenuItem";
import { AlertTriangle, Map } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function MaphatchNav({ onClose }: Props) {
  const { role } = useAuth();

  const isMaphatch = role === 'maphatch_user' || role === 'maphatch_admin';
  if (!isMaphatch) return null;

  return (
    <>
      <NavMenuItem to="/safety-events" label="אירועי בטיחות" icon={AlertTriangle} iconBg="from-red-500 to-rose-500" theme="indigo" onClose={onClose} />
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="indigo" onClose={onClose} />
    </>
  );
}
