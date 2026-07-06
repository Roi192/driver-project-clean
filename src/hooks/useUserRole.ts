import { useAuth, type AppRole } from './useAuth';

export function useUserRole() {
  const { role, loading, realIsDivisionAdmin, activeBrigade } = useAuth();
  const isDivisionBrigadePeek = realIsDivisionAdmin && !!activeBrigade;

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const isDriver = role === 'driver';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';

  // Permission helpers
  const canDelete = role === 'admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const canEdit = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const canEditDrillLocations = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const canEditSafetyFiles = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const canEditSafetyEvents = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || role === 'division_admin';
  const canEditTrainingVideos = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || isDivisionBrigadePeek;
  const canEditProcedures = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || isDivisionBrigadePeek;
  const canAccessUsersManagement = role === 'admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessBomReport = role === 'admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessAnnualWorkPlan = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessSoldiersControl = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessAttendance = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessPunishments = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessInspections = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessHolidays = role === 'admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessFitnessReport = role === 'admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessAccidents = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessCourses = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessCleaningManagement = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessSafetyScores = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessDriverInterviews = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessEquipmentTracking = role === 'admin' || role === 'super_admin' || role === 'battalion_admin' || role === 'division_admin' || isDivisionBrigadePeek;

  return {
    role: role as AppRole | null,
    isSuperAdmin,
    isAdmin,
    isDriver,
    isPlatoonCommander,
    isBattalionAdmin,
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