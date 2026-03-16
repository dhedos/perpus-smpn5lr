
'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Configuration will be populated by Firebase Studio
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_API_KEY",
  authDomain: "REPLACE_WITH_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
};

export function getFirebaseApp(): FirebaseApp {
  const existingApp = getApps().at(0);
  return existingApp || initializeApp(firebaseConfig);
}

export function getAuthService(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreService(): Firestore {
  return getFirestore(getFirebaseApp());
}
