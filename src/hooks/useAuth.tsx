import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Updated roles: super_admin (מנהל ראשי), admin (מ"פ), platoon_commander (מ"מ), battalion_admin (גדוד), hagmar_admin (מנהל הגמ"ר), driver (נהג)
export type AppRole = 'driver' | 'admin' | 'platoon_commander' | 'battalion_admin' | 'super_admin' | 'hagmar_admin' | 'ravshatz';

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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  userType: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isPlatoonCommander: boolean;
  isBattalionAdmin: boolean;
  isHagmarAdmin: boolean;
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
  canAccessHagmarSoldiers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = [
  'super_admin',
  'admin',
  'hagmar_admin',
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    const fetchRoleAndType = async (userId: string) => {
      const [roleResult, typeResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('profiles').select('user_type').eq('user_id', userId).maybeSingle(),
      ]);

      if (!mounted) return;

      if (roleResult.error) {
        console.error('Failed to fetch user roles:', roleResult.error);
        setRole(null);
      } else {
        const roles = (roleResult.data ?? []).map((row) => row.role as AppRole);
        setRole(getHighestPriorityRole(roles));
      }

      if (typeResult.error) {
        console.error('Failed to fetch user type:', typeResult.error);
        setUserType(null);
      } else {
        setUserType(typeResult.data?.user_type ?? null);
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
    const redirectUrl = `${window.location.origin}/`;
    
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
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
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
  };

  // Permission calculations - super_admin gets all admin permissions
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  const isHagmarAdmin = role === 'hagmar_admin' || role === 'super_admin';
  
  // Only admin/super_admin can delete
  const canDelete = role === 'admin' || role === 'super_admin';
  
  // Admin, platoon_commander, battalion_admin, and super_admin can add/edit
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
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canAccessWorkSchedule = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessEquipmentTracking = role === 'admin' || role === 'super_admin' || role === 'battalion_admin';
  const isRavshatz = role === 'ravshatz';
  const canAccessHagmarSoldiers = role === 'hagmar_admin' || role === 'super_admin' || role === 'ravshatz';

  const value = {
    user,
    session,
    role,
    userType,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isSuperAdmin,
    isAdmin,
    isPlatoonCommander,
    isBattalionAdmin,
    isHagmarAdmin,
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
    canAccessHagmarSoldiers,
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