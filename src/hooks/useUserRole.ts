import { useAuth, type AppRole } from './useAuth';

export function useUserRole() {
  const { role, loading, realIsDivisionAdmin, activeBrigade } = useAuth();
  const isDivisionBrigadePeek = realIsDivisionAdmin && !!activeBrigade;

  const isSuperAdmin = role === 'super_admin';
  // brigade_admin has the same admin-level access as admin within their brigade
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'brigade_admin' || isDivisionBrigadePeek;
  const isDriver = role === 'driver';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  const isBrigadeAdmin = role === 'brigade_admin';

  // Permission helpers
  const canDelete = isAdmin;
  const canEdit = isAdmin || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditDrillLocations = isAdmin || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyFiles = isAdmin || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyEvents = isAdmin || role === 'platoon_commander' || role === 'battalion_admin' || role === 'division_admin' || role === 'maphatch_admin';
  const canEditTrainingVideos = isAdmin || role === 'platoon_commander';
  const canEditProcedures = isAdmin || role === 'platoon_commander';
  const canAccessUsersManagement = isAdmin || role === 'division_admin' || role === 'platoon_commander';
  const canAccessBomReport = isAdmin || role === 'division_admin';
  const canAccessAnnualWorkPlan = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessSoldiersControl = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessAttendance = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessPunishments = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessInspections = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessHolidays = isAdmin || role === 'division_admin';
  const canAccessFitnessReport = isAdmin || role === 'division_admin';
  const canAccessAccidents = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessCourses = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessCleaningManagement = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessSafetyScores = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessDriverInterviews = isAdmin || role === 'platoon_commander' || role === 'battalion_admin' || role === 'division_admin';
  const canAccessWeeklyMeeting = isAdmin || role === 'platoon_commander' || role === 'division_admin';
  const canAccessAdminDashboard = isAdmin || role === 'platoon_commander' || role === 'battalion_admin' || role === 'division_admin';
  const canAccessEquipmentTracking = isAdmin || role === 'battalion_admin' || role === 'division_admin';

  return {
    role: role as AppRole | null,
    isSuperAdmin,
    isAdmin,
    isDriver,
    isPlatoonCommander,
    isBattalionAdmin,
    isBrigadeAdmin,
    isLoading: loading,
    canDelete,
    canEdit,
    canEditDrillLocations,
    canEditSafetyFiles,
    canEditSafetyEvents,
    canEditTrainingVideos,
    canEditProcedures,
    canAccessUsersManagement,
    canAccessBomReport,
    canAccessAnnualWorkPlan,
    canAccessSoldiersControl,
    canAccessAttendance,
    canAccessPunishments,
    canAccessInspections,
    canAccessHolidays,
    canAccessFitnessReport,
    canAccessAccidents,
    canAccessCourses,
    canAccessCleaningManagement,
    canAccessSafetyScores,
    canAccessDriverInterviews,
    canAccessWeeklyMeeting,
    canAccessAdminDashboard,
    canAccessEquipmentTracking,
  };
}
