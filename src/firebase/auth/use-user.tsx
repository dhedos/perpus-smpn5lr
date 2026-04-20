
'use client';

/**
 * Re-exporting useUser from provider to ensure single source of truth.
 */
import { useUser as useUserProvider, type UserWithRole as UserWithRoleType } from '../provider';

export type UserWithRole = UserWithRoleType;

export function useUser() {
  const { user, isUserLoading, userError } = useUserProvider();
  
  return { 
    user, 
    loading: isUserLoading, 
    userError,
    isAdmin: user?.role === 'Admin', 
    isStaff: user?.role === 'Staff' || user?.role === 'Admin' 
  };
}
