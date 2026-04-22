
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
 * Di Vercel, kita wajib memasukkan firebaseConfig secara eksplisit
 * untuk menghindari error 'app/no-options'.
 */
export function initializeFirebase() {
  const apps = getApps();
  
  if (!apps.length) {
    // Selalu gunakan firebaseConfig secara eksplisit untuk kompatibilitas Vercel
    const firebaseApp = initializeApp(firebaseConfig);

    // Aktifkan Offline Persistence (Caching) agar aplikasi tetap kencang dan hemat kuota
    if (typeof window !== 'undefined') {
      try {
        initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (e) {
        console.warn('Firestore persistence failed to initialize:', e);
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
