import type { AppRole } from '@/hooks/useAuth';

export type UserDomain = 'drivers' | 'battalion' | 'maphatch' | 'division';

/**
 * Determine a user's management domain from their profile user_type.
 * user_type values: 'driver' | 'commander' | 'officer' | 'battalion' | 'maphatch' | 'division'
 */
export function getUserDomain(userType: string | null | undefined): UserDomain {
  if (userType === 'battalion') return 'battalion';
  if (userType === 'maphatch') return 'maphatch';
  if (userType === 'division') return 'division';
  return 'drivers';
}

/**
 * Returns the roles an actor may assign to a user in a given domain.
 * Brigade/department scope is NOT enforced here — that is the server's responsibility.
 */
export function getAssignableRoles(
  actorRole: AppRole | string | null,
  targetDomain: UserDomain,
): AppRole[] {
  if (!actorRole) return [];

  if (actorRole === 'super_admin' || actorRole === 'ravshatz') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin', 'super_admin'];
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin'];
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin'];
    if (targetDomain === 'division')  return ['division_user', 'division_admin'];
    return [];
  }

  if (actorRole === 'division_admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin'];
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin'];
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin'];
    if (targetDomain === 'division')  return ['division_user', 'division_admin'];
    return [];
  }

  if (actorRole === 'brigade_admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin'];
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin'];
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin'];
    return [];
  }

  if (actorRole === 'admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin'];
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin'];
    return [];
  }

  if (actorRole === 'platoon_commander') {
    if (targetDomain === 'drivers') return ['driver', 'platoon_commander'];
    return [];
  }

  if (actorRole === 'maphatch_admin') {
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin'];
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin'];
    return [];
  }

  return [];
}

// Role display labels within each domain context
export const DOMAIN_ROLE_LABELS: Record<UserDomain, Partial<Record<AppRole, string>>> = {
  drivers: {
    driver:             'נהג (משתמש רגיל)',
    platoon_commander:  'מ"מ נהגים',
    admin:              'מ"פ נהגים (מנהל)',
    brigade_admin:      'מנהל חטיבה',
    super_admin:        'מנהל ראשי',
  },
  battalion: {
    driver:             'משתמש גדוד רגיל',
    battalion_admin:    'מנהל גדוד תע"ם',
  },
  maphatch: {
    maphatch_user:  'משתמש מפח"ט',
    maphatch_admin: 'מנהל מפח"ט',
  },
  division: {
    division_user:  'משתמש מפאו"ג רגיל',
    division_admin: 'מנהל מפאו"ג',
    super_admin:    'מנהל ראשי',
  },
};
