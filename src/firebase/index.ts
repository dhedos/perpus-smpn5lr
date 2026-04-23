
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore'

/**
 * Inisialisasi Firebase yang dioptimalkan untuk lingkungan dengan proxy/workstation.
 * Menggunakan experimentalForceLongPolling untuk stabilitas koneksi yang lebih baik.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);

    // Aktifkan Offline Persistence dan Long Polling untuk menghindari timeout koneksi
    if (typeof window !== 'undefined') {
      try {
        initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          }),
          // Force long polling membantu koneksi di lingkungan yang membatasi WebSockets
          experimentalForceLongPolling: true,
        });
      } catch (e) {
        console.warn('Firestore initialization adjustment failed:', e);
      }
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './auth/use-user';
