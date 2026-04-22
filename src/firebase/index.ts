
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
 * Inisialisasi Firebase SDK.
 * Dioptimalisasi untuk deployment Vercel dengan selalu menyertakan config object
 * guna menghindari error 'app/no-options'.
 */
export function initializeFirebase() {
  const apps = getApps();
  let firebaseApp: FirebaseApp;

  if (!apps.length) {
    // Selalu gunakan config secara eksplisit untuk lingkungan non-Firebase Hosting (seperti Vercel)
    firebaseApp = initializeApp(firebaseConfig);

    // Aktifkan Offline Persistence (Caching) hanya di sisi Client (Browser)
    if (typeof window !== 'undefined') {
      try {
        initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (e) {
        // Jika firestore sudah terinisialisasi oleh modul lain, abaikan error ini
        console.warn('Firestore persistence already initialized or failed.');
      }
    }
  } else {
    firebaseApp = apps[0];
  }

  return getSdks(firebaseApp);
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
