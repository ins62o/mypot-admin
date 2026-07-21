import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

import type {
  AdminDashboardMetrics,
  AdminPocket,
  AdminUser,
  DatabaseBackup,
  DatabaseBackupStatus,
  DatabaseRestoreOperation,
  SupportInquiry,
  VersionNote,
} from '../types/admin';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const requiredConfigValues = [
  firebaseConfig.apiKey,
  firebaseConfig.appId,
  firebaseConfig.authDomain,
  firebaseConfig.messagingSenderId,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
];

export const isFirebaseConfigured = requiredConfigValues.every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = app ? getAuth(app) : null;
const firebaseFunctions = app ? getFunctions(app, 'asia-northeast3') : null;

export function subscribeToAdminSession(callback: (user: User | null) => void) {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(firebaseAuth, callback);
}

export async function loginAdminWithEmail(email: string, password: string) {
  if (!firebaseAuth) {
    throw new Error('Firebase 환경 변수가 설정되지 않았어요.');
  }

  await setPersistence(firebaseAuth, browserLocalPersistence);
  await signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function logoutAdmin() {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}

export async function loadAdminUsers(): Promise<AdminUser[]> {
  const result = await callAdminFunction<{ users: AdminUser[] }>('listAdminUsers');
  return result.users;
}

export async function loadAdminPockets(): Promise<AdminPocket[]> {
  const result = await callAdminFunction<{ pockets: AdminPocket[] }>('listAdminPockets');
  return result.pockets;
}

export async function loadAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const result = await callAdminFunction<{ metrics: AdminDashboardMetrics }>(
    'getAdminDashboardMetrics',
  );
  return result.metrics;
}

export async function loadAdminVersionNotes(): Promise<VersionNote[]> {
  const result = await callAdminFunction<{ notes: VersionNote[] }>('listAdminVersionNotes');
  return result.notes;
}

export async function saveAdminVersionNote(note: VersionNote) {
  await callAdminFunction('saveAdminVersionNote', note);
}

export async function loadAdminSupportInquiries(): Promise<SupportInquiry[]> {
  const result = await callAdminFunction<{ inquiries: SupportInquiry[] }>(
    'listAdminSupportInquiries',
  );
  return result.inquiries;
}

export async function loadAdminDatabaseStatus(): Promise<DatabaseBackupStatus> {
  const result = await callAdminFunction<{ databaseStatus: DatabaseBackupStatus }>(
    'getAdminDatabaseStatus',
  );
  return result.databaseStatus;
}

export async function startAdminDatabaseRestore(
  backup: DatabaseBackup,
  databaseId: string,
  confirmText: string,
  secondConfirm: boolean,
): Promise<DatabaseRestoreOperation> {
  const result = await callAdminFunction<{ restore: DatabaseRestoreOperation }>(
    'startAdminDatabaseRestore',
    {
      backupName: backup.name,
      confirmText,
      databaseId,
      secondConfirm,
    },
  );
  return result.restore;
}

export async function answerSupportInquiry(inquiry: SupportInquiry, answer: string) {
  if (!inquiry.userId) {
    throw new Error('문의 사용자 ID가 없어 Firebase에 답변을 저장할 수 없어요.');
  }

  await callAdminFunction('answerSupportInquiry', {
    answer,
    inquiryId: inquiry.id,
    userId: inquiry.userId,
  });
}

async function callAdminFunction<TResponse>(name: string, payload?: unknown) {
  if (!firebaseFunctions) {
    throw new Error('Firebase Functions 환경 변수가 설정되지 않았어요.');
  }

  const callable = httpsCallable<unknown, TResponse>(firebaseFunctions, name);
  const result = await callable(payload ?? {});
  return result.data;
}


