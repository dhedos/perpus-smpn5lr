
'use client';

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './error-emitter';
export * from './errors';
export { getFirebaseApp, getFirestoreService, getAuthService } from './config';

import { getFirebaseApp, getFirestoreService, getAuthService } from './config';

export function initializeFirebase() {
  const app = getFirebaseApp();
  const firestore = getFirestoreService();
  const auth = getAuthService();
  return { app, firestore, auth };
}
