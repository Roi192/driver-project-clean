import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavMenuItem } from "./NavMenuItem";
import {
  LayoutDashboard, Calendar, ClipboardCheck, Users, UserCheck, Gavel, DoorOpen,
  ShieldAlert, FileSearch, Gauge, Car, Map, UserCog, Building, Sparkles,
  GraduationCap, BarChart3, CalendarDays, Crosshair, Home, Bell, Building2,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

export function AdminNav({ onClose }: Props) {
  const {
    isAdmin, isPlatoonCommander, isBattalionAdmin, isSuperAdmin, isDivisionUser, role,
    canAccessUsersManagement, canAccessBomReport, canAccessAnnualWorkPlan,
    canAccessSoldiersControl, canAccessAttendance, canAccessPunishments,
    canAccessInspections, canAccessHolidays, canAccessFitnessReport,
    canAccessAccidents, canAccessCourses, canAccessCleaningManagement,
    canAccessSafetyScores, canAccessDriverInterviews, canAccessWorkSchedule,
    canAccessWeeklyMeeting, canAccessEquipmentTracking,
  } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { realIsDivisionAdmin, activeBrigade } = useAuth() as any;
  const location = useLocation();

  const isInHagmar = location.pathname.startsWith('/hagmar');
  const isOnDepartmentSelector = location.pathname === '/department-selector';
  const superAdminBattalionContext = isSuperAdmin && sessionStorage.getItem('superAdminDeptContext') === 'battalion';
  const isInBattalionContext = isBattalionAdmin || superAdminBattalionContext;
  const isInDivisionView = isDivisionUser && !activeBrigade && !isInHagmar && !isOnDepartmentSelector;
  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin || (realIsDivisionAdmin && !!activeBrigade);
  const showPlanagMenu = !isInHagmar && !isInBattalionContext && !(isSuperAdmin && isOnDepartmentSelector) && !isInDivisionView;
  const showSuperAdminSelector = isSuperAdmin && isOnDepartmentSelector;

  if (!showSuperAdminSelector && (!hasAdminAccess || !showPlanagMenu)) return null;

  if (showSuperAdminSelector) {
    return (
      <>
        <NavMenuItem to="/department-selector" label="דף הבית" icon={Home} iconBg="from-amber-500 to-orange-600" theme="amber" onClose={onClose} />
        <NavMenuItem to="/super-admin-dashboard" label='דשבורד מנהל ראשי' icon={LayoutDashboard} iconBg="from-gold via-gold-dark to-gold" iconColor="text-slate-900" theme="amber" onClose={onClose} />
      </>
    );
  }

  return (
    <>
      <NavMenuItem to="/admin" label="דשבורד מנהל" icon={LayoutDashboard} iconBg="from-gold via-gold-dark to-gold" iconColor="text-slate-900" theme="gold" onClose={onClose} />
      {canAccessAnnualWorkPlan && <NavMenuItem to="/annual-work-plan" label="תוכנית עבודה שנתית" icon={Calendar} iconBg="from-emerald-500 to-emerald-600" theme="gold" onClose={onClose} />}
      {canAccessBomReport && <NavMenuItem to="/bom-report" label='דו"ח בו"מ' icon={ClipboardCheck} iconBg="from-blue-500 to-blue-600" theme="gold" onClose={onClose} />}
      {canAccessSoldiersControl && <NavMenuItem to="/soldiers-control" label="טבלת שליטה" icon={Users} iconBg="from-purple-500 to-purple-600" theme="gold" onClose={onClose} />}
      {canAccessAttendance && <NavMenuItem to="/attendance-tracking" label="מעקב נוכחות" icon={UserCheck} iconBg="from-teal-500 to-teal-600" theme="gold" onClose={onClose} />}
      {canAccessPunishments && <NavMenuItem to="/punishments" label="מעקב עונשים" icon={Gavel} iconBg="from-red-500 to-red-600" theme="gold" onClose={onClose} />}
      {(isAdmin || isPlatoonCommander) && <NavMenuItem to="/exit-requests" label="מעקב בקשות יציאה" icon={DoorOpen} iconBg="from-blue-500 to-indigo-600" theme="gold" onClose={onClose} />}
      {(isAdmin || isPlatoonCommander) && <NavMenuItem to="/warnings" label="אזהרות וענישה" icon={ShieldAlert} iconBg="from-red-500 to-orange-600" theme="gold" onClose={onClose} />}
      {(isAdmin || isPlatoonCommander) && <NavMenuItem to="/tasks-tracking" label="מעקב משימות" icon={ClipboardCheck} iconBg="from-emerald-500 to-teal-600" theme="gold" onClose={onClose} />}
      {canAccessInspections && <NavMenuItem to="/inspections" label="ביקורות" icon={FileSearch} iconBg="from-indigo-500 to-indigo-600" theme="gold" onClose={onClose} />}
      {canAccessSafetyScores && <NavMenuItem to="/safety-scores" label="ציוני בטיחות" icon={Gauge} iconBg="from-sky-500 to-sky-600" theme="gold" onClose={onClose} />}
      {canAccessAccidents && <NavMenuItem to="/accidents-tracking" label="מעקב תאונות" icon={Car} iconBg="from-orange-500 to-orange-600" theme="gold" onClose={onClose} />}
      <NavMenuItem to="/know-the-area" label="הכר את הגזרה" icon={Map} iconBg="from-cyan-500 to-cyan-600" theme="gold" onClose={onClose} />
      {canAccessUsersManagement && role !== 'hagmar_admin' && <NavMenuItem to="/users-management" label="ניהול משתמשים" icon={UserCog} iconBg="from-pink-500 to-pink-600" theme="gold" onClose={onClose} />}
      {(isAdmin || isPlatoonCommander || isSuperAdmin || realIsDivisionAdmin) && <NavMenuItem to="/brigade-outposts" label="ניהול מוצבי החטיבה" icon={Building} iconBg="from-emerald-500 to-teal-600" theme="gold" onClose={onClose} />}
      {canAccessCleaningManagement && <NavMenuItem to="/cleaning-parades-admin" label="ניהול מסדרי ניקיון" icon={Sparkles} iconBg="from-purple-500 to-pink-500" theme="gold" onClose={onClose} />}
      {canAccessCourses && <NavMenuItem to="/courses-management" label="ניהול קורסים" icon={GraduationCap} iconBg="from-indigo-500 to-violet-600" theme="gold" onClose={onClose} />}
      {canAccessDriverInterviews && <NavMenuItem to="/admin-driver-interviews" label="מעקב ראיונות נהגי קו" icon={ClipboardCheck} iconBg="from-violet-500 to-violet-600" theme="gold" onClose={onClose} />}
      {canAccessDriverInterviews && <NavMenuItem to="/driver-interviews" label="ביצוע ראיון נהג קו" icon={ClipboardCheck} iconBg="from-violet-500 to-violet-600" theme="gold" onClose={onClose} />}
      {canAccessFitnessReport && <NavMenuItem to="/fitness-report" label="דוח כשירות מרוכז" icon={FileSearch} iconBg="from-green-500 to-green-600" theme="gold" onClose={onClose} />}
      {canAccessFitnessReport && <NavMenuItem to="/yearly-summary" label="סיכום עד כאן" icon={BarChart3} iconBg="from-emerald-500 to-teal-600" theme="gold" onClose={onClose} />}
      {canAccessWorkSchedule && <NavMenuItem to="/work-schedule" label="סידור עבודה" icon={Calendar} iconBg="from-lime-500 to-lime-600" theme="gold" onClose={onClose} />}
      {canAccessWeeklyMeeting && <NavMenuItem to="/weekly-meeting" label="פתיחת שבוע" icon={CalendarDays} iconBg="from-amber-500 to-amber-600" theme="gold" onClose={onClose} />}
      {canAccessHolidays && <NavMenuItem to="/holidays-management" label="חגים ואזכורים" icon={Calendar} iconBg="from-yellow-500 to-yellow-600" theme="gold" onClose={onClose} />}
      {canAccessEquipmentTracking && <NavMenuItem to="/equipment-tracking" label='מעקב צל"ם' icon={Crosshair} iconBg="from-rose-500 to-rose-700" theme="gold" onClose={onClose} />}
      {(isAdmin || isPlatoonCommander || isSuperAdmin) && <NavMenuItem to="/frameworks" label="ניהול מסגרות" icon={Building2} iconBg="from-teal-500 to-teal-600" theme="gold" onClose={onClose} />}
      <NavMenuItem to="/notification-settings" label="הגדרות התראות" icon={Bell} iconBg="from-sky-500 to-sky-600" theme="gold" onClose={onClose} />
    </>
  );
}
