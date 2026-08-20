import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NavMenuItem } from "./NavMenuItem";
import {
  Home, AlertTriangle, Car, FolderOpen, MapPin, Map, Users,
  Building2, ChevronLeft,
} from "lucide-react";

export const BRIGADE_CTX_KEY = "brigadeAdminContext";

interface Props {
  onClose: () => void;
}

export function BrigadeNav({ onClose }: Props) {
  const { isBrigadeAdmin } = useAuth();
  const navigate = useNavigate();

  const brigadeAdminCtx = sessionStorage.getItem(BRIGADE_CTX_KEY);
  // Only show when brigade_admin is in default (brigade) context
  if (!isBrigadeAdmin || (brigadeAdminCtx && brigadeAdminCtx !== "brigade")) return null;

  const enterDept = (ctx: "planag" | "maphatch" | "battalion", path: string) => {
    sessionStorage.setItem(BRIGADE_CTX_KEY, ctx);
    if (ctx === "maphatch") sessionStorage.removeItem("maphatchDeptContext");
    navigate(path);
    onClose();
  };

  const deptButtonClass =
    "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white " +
    "transition-all duration-300 relative overflow-hidden group border border-gold/30 " +
    "hover:bg-gradient-to-l hover:to-transparent hover:border-gold/60";

  return (
    <>
      {/* Brigade home */}
      <NavMenuItem
        to="/brigade-dashboard"
        label="דשבורד חטיבה"
        icon={Home}
        iconBg="from-gold via-gold-dark to-gold"
        iconColor="text-slate-900"
        theme="gold"
        onClose={onClose}
      />

      {/* Safety & operations */}
      <NavMenuItem to="/safety-events" label="אירועי בטיחות" icon={AlertTriangle} iconBg="from-red-500 to-rose-600" theme="gold" onClose={onClose} />
      <NavMenuItem to="/accidents-tracking" label="תאונות" icon={Car} iconBg="from-orange-500 to-orange-700" theme="gold" onClose={onClose} />
      <NavMenuItem to="/safety-files" label="תיקי בטיחות" icon={FolderOpen} iconBg="from-amber-500 to-amber-700" theme="gold" onClose={onClose} />
      <NavMenuItem to="/drill-locations" label="נקודות תרגולות" icon={MapPin} iconBg="from-emerald-500 to-teal-600" theme="gold" onClose={onClose} />
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-700" theme="gold" onClose={onClose} />

      {/* Users management */}
      <NavMenuItem to="/users-management" label="ניהול משתמשי נהגים" icon={Users} iconBg="from-pink-500 to-pink-700" theme="gold" onClose={onClose} />
      <NavMenuItem to="/battalion-users-management" label='ניהול משתמשי גדוד תע"ם' icon={Users} iconBg="from-indigo-500 to-indigo-700" theme="gold" onClose={onClose} />
      <NavMenuItem to="/maphatch-users" label='ניהול משתמשי מפח"ט' icon={Users} iconBg="from-teal-500 to-teal-600" theme="gold" onClose={onClose} />

      {/* Department context switcher */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 font-bold mb-2 px-1">כניסה למחלקה</p>

        {/* פלנ"ג */}
        <button
          onClick={() => enterDept("planag", "/admin")}
          className={deptButtonClass + " hover:from-blue-500/20 mb-2"}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-base flex-1 text-right">פלנ&quot;ג — מחלקת נהגים</span>
          <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-gold group-hover:-translate-x-1 transition-all duration-300" />
        </button>

        {/* מפח"ט */}
        <button
          onClick={() => enterDept("maphatch", "/maphatch-dept-selector")}
          className={deptButtonClass + " hover:from-emerald-500/20 mb-2"}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-base flex-1 text-right">מפח&quot;ט</span>
          <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all duration-300" />
        </button>

        {/* גדוד תע"ם */}
        <button
          onClick={() => enterDept("battalion", "/battalion-users-management")}
          className={deptButtonClass + " hover:from-indigo-500/20"}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-base flex-1 text-right">גדוד תע&quot;ם</span>
          <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all duration-300" />
        </button>
      </div>
    </>
  );
}
