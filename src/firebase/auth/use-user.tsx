
'use client';

/**
 * Enhanced useUser hook that provides role-based access flags.
 */
import { useFirebase, type UserWithRole as UserWithRoleType } from '../provider';

export type UserWithRole = UserWithRoleType;

export function useUser() {
  const { user, isUserLoading, userError } = useFirebase();
  
  // Case-insensitive role comparison for better reliability
  const role = user?.role?.toLowerCase();
  
  return { 
    user, 
    loading: isUserLoading, 
    userError,
    isAdmin: role === 'admin', 
    isStaff: role === 'staff' || role === 'admin' 
  };
}
