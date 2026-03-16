
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

export interface UserWithRole extends User {
  role?: 'Admin' | 'Staff';
  displayNameCustom?: string;
}

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
          if (staffDoc.exists()) {
            const data = staffDoc.data();
            setUser({
              ...firebaseUser,
              role: data.role,
              displayNameCustom: data.name
            } as UserWithRole);
          } else {
            setUser(firebaseUser as UserWithRole);
          }
        } catch (e) {
          setUser(firebaseUser as UserWithRole);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  return { user, loading, isAdmin: user?.role === 'Admin', isStaff: user?.role === 'Staff' };
}
