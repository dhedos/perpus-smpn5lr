
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

export interface UserWithRole extends User {
  role?: 'Admin' | 'Staff' | 'Teacher' | 'Student';
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
          // Mengambil profil dari koleksi 'users' sesuai backend.json
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              ...firebaseUser,
              role: data.role,
              displayNameCustom: data.name || data.email?.split('@')[0]
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

  return { user, loading, isAdmin: user?.role === 'Admin', isStaff: user?.role === 'Staff' || user?.role === 'Admin' };
}
