import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const PRODUCTION_URL = 'https://driver-project.vercel.app';

const getAuthRedirectUrl = (path: string): string => {
  if (Capacitor.isNativePlatform()) {
    return `${PRODUCTION_URL}${path}`;
  }
  return `${window.location.origin}${path}`;
};

// Updated roles: super_admin (מנהל ראשי), admin (מ"פ), platoon_commander (מ"מ), battalion_admin (גדוד), driver (נהג)
export type AppRole = 'driver' | 'admin' | 'platoon_commander' | 'battalion_admin' | 'super_admin' | 'ravshatz' | 'division_admin' | 'division_user';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  userType: 'driver' | 'battalion';
  outpost?: string;
  region?: string;
  militaryRole?: string;
  platoon?: string;
  personalNumber?: string;
  department?: string;
  settlement?: string;
  idNumber?: string;
  battalionName?: string;
  brigade?: string; // brigade code, e.g. 'binyamin', 'etzion'
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  userType: string | null;
  brigade: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isPlatoonCommander: boolean;
  isBattalionAdmin: boolean;
  isDivisionAdmin: boolean;
  realIsDivisionAdmin: boolean;
  isDivisionUser: boolean;
  isBattalion: boolean;
  activeBrigade: string | null;
  setActiveBrigade: (code: string | null) => Promise<void>;
  canDelete: boolean;
  canEdit: boolean;
  canEditDrillLocations: boolean;
  canEditSafetyFiles: boolean;
  canEditSafetyEvents: boolean;
  canEditTrainingVideos: boolean;
  canEditProcedures: boolean;
  canAccessUsersManagement: boolean;
  canAccessBomReport: boolean;
  canAccessAnnualWorkPlan: boolean;
  canAccessSoldiersControl: boolean;
  canAccessAttendance: boolean;
  canAccessPunishments: boolean;
  canAccessInspections: boolean;
  canAccessHolidays: boolean;
  canAccessFitnessReport: boolean;
  canAccessAccidents: boolean;
  canAccessCourses: boolean;
  canAccessCleaningManagement: boolean;
  canAccessSafetyScores: boolean;
  canAccessDriverInterviews: boolean;
  canAccessAdminDashboard: boolean;
  canAccessWorkSchedule: boolean;
  canAccessWeeklyMeeting: boolean;
  canAccessEquipmentTracking: boolean;
  isRavshatz: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = [
  'super_admin',
  'division_admin',
  'division_user',
  'admin',
  'battalion_admin',
  'platoon_commander',
  'ravshatz',
  'driver',
];

const getHighestPriorityRole = (roles: AppRole[]): AppRole | null => {
  return ROLE_PRIORITY.find((candidate) => roles.includes(candidate)) ?? null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profileBrigade, setProfileBrigade] = useState<string | null>(null);
  const [brigadeOverride, setBrigadeOverride] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('brigadeContext');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    const fetchRoleAndType = async (userId: string) => {
      const [roleResult, typeResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('profiles').select('user_type, brigade').eq('user_id', userId).maybeSingle(),
      ]);

      if (!mounted) return;

      let fetchedRole: AppRole | null = null;

      if (roleResult.error) {
        console.error('Failed to fetch user roles:', roleResult.error);
        setRole(null);
      } else {
        const roles = (roleResult.data ?? []).map((row) => row.role as AppRole);
        fetchedRole = getHighestPriorityRole(roles);
        setRole(fetchedRole);
      }

      if (typeResult.error) {
        console.error('Failed to fetch user type:', typeResult.error);
        setUserType(null);
        setProfileBrigade(null);
      } else {
        const nextUserType = typeResult.data?.user_type ?? null;
        let nextProfileBrigade = (typeResult.data as any)?.brigade ?? null;
        const selectedBrigade = typeof window !== 'undefined' ? sessionStorage.getItem('brigadeContext') : null;

        const isBattalionProfile = nextUserType === 'battalion' || fetchedRole === 'battalion_admin';

        if (isBattalionProfile && selectedBrigade && nextProfileBrigade !== selectedBrigade) {
          const { error } = await supabase
            .from('profiles')
            .update({ brigade: selectedBrigade })
            .eq('user_id', userId);
          if (error) {
            console.error('Failed to sync battalion brigade context:', error);
          } else {
            nextProfileBrigade = selectedBrigade;
          }
        }

        setUserType(nextUserType);
        setProfileBrigade(nextProfileBrigade);
      }
    };

    // Set up auth state listener FIRST - MUST be synchronous per Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          if (event === 'SIGNED_IN') {
            // On login, re-enter loading state until role is fetched
            setLoading(true);
            fetchRoleAndType(session.user.id).then(() => {
              if (mounted) setLoading(false);
            });
          } else {
            // For other events (TOKEN_REFRESHED etc), fire-and-forget
            fetchRoleAndType(session.user.id);
          }
        } else {
          setRole(null);
          setUserType(null);
          setProfileBrigade(null);
        }
      }
    );

    // THEN check for existing session - this controls loading state
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchRoleAndType(session.user.id);
      }
      if (mounted && !initialLoadDone) {
        initialLoadDone = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (data: SignUpData) => {
    const redirectUrl = getAuthRedirectUrl('/');
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
          data: {
          full_name: data.fullName,
          user_type: data.userType,
          outpost: data.outpost || null,
          region: data.region || null,
          military_role: data.militaryRole || null,
          platoon: data.platoon || null,
          personal_number: data.personalNumber || null,
          department: data.department || 'planag',
          settlement: data.settlement || null,
          id_number: data.idNumber || null,
          battalion_name: data.battalionName || null,
          brigade: data.brigade || 'binyamin',
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = getAuthRedirectUrl('/');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setUserType(null);
    setProfileBrigade(null);
    setBrigadeOverride(null);
    if (typeof window !== 'undefined') sessionStorage.removeItem('brigadeContext');
  };

  // Permission calculations - super_admin gets all admin permissions
  const isSuperAdmin = role === 'super_admin';
  const realIsDivisionAdmin = role === 'division_admin' || role === 'super_admin';
  const isDivisionBrigadePeek = realIsDivisionAdmin && !!brigadeOverride;
  const isAdmin = role === 'admin' || role === 'super_admin' || isDivisionBrigadePeek;
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  const isDivisionUser = role === 'division_user' || realIsDivisionAdmin;
  const isBattalion = userType === 'battalion' || role === 'battalion_admin';
  // Effective brigade: if a privileged admin selected a specific brigade context, use it.
  // Otherwise, use their profile brigade (or null for "all brigades" view).
  const brigade = realIsDivisionAdmin
    ? (brigadeOverride || null)
    : (isBattalion ? (brigadeOverride || profileBrigade) : profileBrigade);
  // isDivisionAdmin becomes false when a specific brigade is selected,
  // so existing brigade-scoped filters automatically apply.
  const isDivisionAdmin = realIsDivisionAdmin && !brigadeOverride;

  useEffect(() => {
    if (!isBattalion || !user?.id || !brigadeOverride || profileBrigade === brigadeOverride) return;
    supabase
      .from('profiles')
      .update({ brigade: brigadeOverride })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to sync battalion brigade context:', error);
        } else {
          setProfileBrigade(brigadeOverride);
        }
      });
  }, [isBattalion, user?.id, brigadeOverride, profileBrigade]);

  const setActiveBrigade = async (code: string | null) => {
    if (code && !realIsDivisionAdmin && !isBattalion) {
      throw new Error('אין הרשאה להיכנס לחטיבות');
    }
    if (isBattalion && user?.id && code) {
      const { error } = await supabase
        .from('profiles')
        .update({ brigade: code })
        .eq('user_id', user.id);
      if (error) throw error;
      setProfileBrigade(code);
    }
    if (typeof window !== 'undefined') {
      if (code) sessionStorage.setItem('brigadeContext', code);
      else sessionStorage.removeItem('brigadeContext');
    }
    setBrigadeOverride(code);
  };
  
  // Only admin/super_admin can delete
  const canDelete = role === 'admin' || role === 'super_admin' || isDivisionBrigadePeek;
  
  // Admin, platoon_commander, battalion_admin, and super_admin can add/edit
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
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessWorkSchedule = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander' || role === 'super_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const canAccessEquipmentTracking = role === 'admin' || role === 'super_admin' || role === 'battalion_admin' || role === 'division_admin' || isDivisionBrigadePeek;
  const isRavshatz = role === 'ravshatz';

  const value = {
    user,
    session,
    role,
    userType,
    brigade,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isSuperAdmin,
    isAdmin,
    isPlatoonCommander,
    isBattalionAdmin,
    isDivisionAdmin,
    realIsDivisionAdmin,
    isDivisionUser,
    isBattalion,
    activeBrigade: (realIsDivisionAdmin || isBattalion) ? brigadeOverride : null,
    setActiveBrigade,
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
    canAccessAdminDashboard,
    canAccessWorkSchedule,
    canAccessWeeklyMeeting,
    canAccessEquipmentTracking,
    isRavshatz,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}