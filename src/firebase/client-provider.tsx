
'use client';

import React, { useMemo } from 'react';
import { getFirebaseApp, getFirestoreService, getAuthService } from './config';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const app = useMemo(() => getFirebaseApp(), []);
  const firestore = useMemo(() => getFirestoreService(), []);
  const auth = useMemo(() => getAuthService(), []);

  return (
    <FirebaseProvider app={app} firestore={firestore} auth={auth}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
