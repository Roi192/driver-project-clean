export type UserDomain = 'drivers' | 'battalion' | 'maphatch' | 'division'

/**
 * Determine a user's management domain from their profile user_type.
 * user_type values: 'driver' | 'commander' | 'officer' | 'battalion' | 'maphatch' | 'division'
 */
export function getUserDomain(userType: string | null | undefined): UserDomain {
  if (userType === 'battalion') return 'battalion'
  if (userType === 'maphatch') return 'maphatch'
  if (userType === 'division') return 'division'
  return 'drivers'
}

/**
 * Returns the roles an actor may assign to a user in a given domain.
 * Brigade/department scope is NOT enforced here — callers must enforce it separately.
 */
export function getAssignableRoles(actorRole: string | null, targetDomain: UserDomain): string[] {
  if (!actorRole) return []

  if (actorRole === 'super_admin' || actorRole === 'ravshatz') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin', 'super_admin']
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin']
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin']
    if (targetDomain === 'division')  return ['division_user', 'division_admin']
    return []
  }

  if (actorRole === 'division_admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin']
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin']
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin']
    if (targetDomain === 'division')  return ['division_user', 'division_admin']
    return []
  }

  if (actorRole === 'brigade_admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin', 'brigade_admin']
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin']
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin']
    return []
  }

  if (actorRole === 'admin') {
    if (targetDomain === 'drivers')   return ['driver', 'platoon_commander', 'admin']
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin']
    return []
  }

  if (actorRole === 'platoon_commander') {
    if (targetDomain === 'drivers') return ['driver', 'platoon_commander']
    return []
  }

  if (actorRole === 'maphatch_admin') {
    if (targetDomain === 'battalion') return ['driver', 'battalion_admin']
    if (targetDomain === 'maphatch')  return ['maphatch_user', 'maphatch_admin']
    return []
  }

  return []
}
