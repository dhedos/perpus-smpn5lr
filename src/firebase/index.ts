
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

// Inisialisasi Firebase dengan penanganan lingkungan (Environment) yang lebih kuat
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    
    // Selalu prioritaskan config object jika tersedia untuk menghindari error 'no-options' pada deployment non-hosting
    if (firebaseConfig && firebaseConfig.apiKey) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        console.error('Firebase initialization failed: No config found.', e);
        // Fallback terakhir agar aplikasi tidak crash total
        firebaseApp = initializeApp(firebaseConfig);
      }
    }

    // Aktifkan Offline Persistence (Caching) untuk penghematan kuota
    if (typeof window !== 'undefined') {
      try {
        initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (e) {
        console.warn('Firestore persistence initialization failed. Falling back to default.', e);
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
