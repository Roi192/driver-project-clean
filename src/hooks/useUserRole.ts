import { useAuth, type AppRole } from './useAuth';

export function useUserRole() {
  const { role, loading } = useAuth();

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isDriver = role === 'driver';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  const isHagmarAdmin = role === 'hagmar_admin' || role === 'super_admin';

  // Permission helpers
  const canDelete = role === 'admin' || role === 'super_admin';
  const canEdit = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditDrillLocations = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditSafetyFiles = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditSafetyEvents = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditTrainingVideos = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canEditProcedures = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessUsersManagement = role === 'admin' || role === 'super_admin' || role === 'hagmar_admin';
  const canAccessBomReport = role === 'admin' || role === 'super_admin';
  const canAccessAnnualWorkPlan = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessSoldiersControl = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessAttendance = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessPunishments = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessInspections = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessHolidays = role === 'admin' || role === 'super_admin';
  const canAccessFitnessReport = role === 'admin' || role === 'super_admin';
  const canAccessAccidents = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessCourses = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessCleaningManagement = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessSafetyScores = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessDriverInterviews = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canAccessEquipmentTracking = role === 'admin' || role === 'super_admin' || role === 'battalion_admin';

  return {
    role: role as AppRole | null,
    isSuperAdmin,
    isAdmin,
    isDriver,
    isPlatoonCommander,
    isBattalionAdmin,
    isHagmarAdmin,
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