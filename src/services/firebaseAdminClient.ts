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
  AdminPocketMember,
  AdminUser,
  AdminUserPage,
  AppUpdateConfig,
  AppUpdateRelease,
  DatabaseBackup,
  DatabaseBackupStatus,
  DatabaseRestoreOperation,
  MaintenanceConfig,
  ContentReport,
  ModerationAction,
  SupportInquiry,
  VersionNote,
} from '../types/admin';

export type DatabaseEnvironment = 'development' | 'production';

type RawSupportInquiry = Omit<SupportInquiry, 'attachments' | 'status'> & {
  attachments?: SupportInquiry['attachments'] | null;
  status?: string | null;
};

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

export async function loadAdminUsers(
  environment: DatabaseEnvironment = 'production',
  options: { page?: number; pageSize?: number; query?: string; status?: 'active' | 'all' | 'suspended' } = {},
): Promise<AdminUserPage> {
  return callAdminFunction<AdminUserPage>('listAdminUsers', { environment, ...options });
}

export async function setAdminUserSuspension(
  userId: string,
  options: { durationDays?: number; lift?: boolean; permanent?: boolean },
  environment: DatabaseEnvironment = 'production',
) {
  await callAdminFunction('setAdminUserSuspension', { environment, userId, ...options });
}

export async function loadAdminPockets(
  environment: DatabaseEnvironment = 'production',
): Promise<AdminPocket[]> {
  const result = await callAdminFunction<{ pockets: AdminPocket[] }>('listAdminPockets', {
    environment,
  });
  return result.pockets;
}

export async function loadAdminPocketMembers(
  pocketId: string,
  environment: DatabaseEnvironment = 'production',
): Promise<AdminPocketMember[]> {
  const result = await callAdminFunction<{ members: AdminPocketMember[] }>(
    'listAdminPocketMembers',
    { environment, pocketId },
  );
  return result.members;
}

export async function loadAdminDashboardMetrics(
  environment: DatabaseEnvironment = 'production',
): Promise<AdminDashboardMetrics> {
  const result = await callAdminFunction<{ metrics: AdminDashboardMetrics }>(
    'getAdminDashboardMetrics',
    { environment },
  );
  return result.metrics;
}

export async function loadAdminContentReports(environment: DatabaseEnvironment = 'production'): Promise<ContentReport[]> {
  const result = await callAdminFunction<{ reports: ContentReport[] }>('listAdminContentReports', { environment });
  return result.reports.filter(isActionableContentReport);
}

export async function resolveAdminContentReport(reportId: string, action: ModerationAction, adminNote: string, environment: DatabaseEnvironment = 'production') {
  return callAdminFunction<{ reportId: string; status: 'dismissed' | 'resolved' }>('resolveAdminContentReport', { action, adminNote, environment, reportId });
}

export async function loadAdminVersionNotes(
  environment: DatabaseEnvironment = 'production',
): Promise<VersionNote[]> {
  const result = await callAdminFunction<{ notes: VersionNote[] }>('listAdminVersionNotes', {
    environment,
  });
  return result.notes;
}

export async function loadAdminAppUpdateConfig(
  environment: DatabaseEnvironment = 'production',
): Promise<AppUpdateConfig> {
  const result = await callAdminFunction<{ config: AppUpdateConfig }>(
    'getAdminAppUpdateConfig',
    { environment },
  );
  return result.config;
}

export async function saveAdminAppUpdateConfig(
  config: AppUpdateConfig,
  environment: DatabaseEnvironment = 'production',
): Promise<AppUpdateConfig> {
  const result = await callAdminFunction<{ config: AppUpdateConfig }>(
    'saveAdminAppUpdateConfig',
    { ...config, environment },
  );
  return result.config;
}

export async function loadAdminAppUpdateReleases(
  environment: DatabaseEnvironment = 'production',
): Promise<AppUpdateRelease[]> {
  const result = await callAdminFunction<{ releases: AppUpdateRelease[] }>(
    'listAdminAppUpdateReleases',
    { environment },
  );
  return result.releases;
}

export async function deleteLatestAdminAppUpdateRelease(
  releaseId: string,
  environment: DatabaseEnvironment = 'production',
): Promise<AppUpdateConfig> {
  const result = await callAdminFunction<{
    config: AppUpdateConfig;
    deletedId: string;
  }>('deleteLatestAdminAppUpdateRelease', { environment, releaseId });
  return result.config;
}

async function callDevelopmentPublicFunction<T>(name: string): Promise<T> {
  const response = await fetch(
    `https://asia-northeast3-mypot-dev-8558a.cloudfunctions.net/${name}`,
    {
      body: JSON.stringify({ data: {} }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  const payload = (await response.json()) as {
    data?: T;
    result?: T;
  };
  const result = payload.data ?? payload.result;
  if (!response.ok || !result) {
    throw new Error('개발 공개 설정을 불러오지 못했어요.');
  }
  return result;
}

export async function loadPublishedAppUpdateConfig(
  environment: DatabaseEnvironment = 'production',
): Promise<AppUpdateConfig> {
  if (environment === 'development') {
    const result = await callDevelopmentPublicFunction<{ config: AppUpdateConfig }>(
      'getPublishedAppUpdate',
    );
    return result.config;
  }
  const result = await callAdminFunction<{ config: AppUpdateConfig }>(
    'getPublishedAppUpdate',
  );
  return result.config;
}

export async function loadAdminMaintenanceConfig(
  environment: DatabaseEnvironment = 'production',
): Promise<MaintenanceConfig> {
  const result = await callAdminFunction<{ config: MaintenanceConfig }>(
    'getAdminMaintenanceConfig',
    { environment },
  );
  return result.config;
}

export async function saveAdminMaintenanceConfig(
  config: MaintenanceConfig,
  environment: DatabaseEnvironment = 'production',
): Promise<MaintenanceConfig> {
  const result = await callAdminFunction<{ config: MaintenanceConfig }>(
    'saveAdminMaintenanceConfig',
    { ...config, environment },
  );
  return result.config;
}

export async function loadPublishedMaintenanceConfig(
  environment: DatabaseEnvironment = 'production',
): Promise<MaintenanceConfig> {
  if (environment === 'development') {
    const result = await callDevelopmentPublicFunction<{ config: MaintenanceConfig }>(
      'getPublishedMaintenance',
    );
    return result.config;
  }
  const result = await callAdminFunction<{ config: MaintenanceConfig }>(
    'getPublishedMaintenance',
  );
  return result.config;
}

export async function saveAdminVersionNote(
  note: VersionNote,
  environment: DatabaseEnvironment = 'production',
) {
  await callAdminFunction('saveAdminVersionNote', { ...note, environment });
}

export async function deleteAdminVersionNote(
  noteId: string,
  environment: DatabaseEnvironment = 'production',
) {
  await callAdminFunction('deleteAdminVersionNote', { environment, noteId });
}

export async function loadAdminSupportInquiries(
  environment: DatabaseEnvironment = 'production',
): Promise<SupportInquiry[]> {
  const result = await callAdminFunction<{ inquiries?: RawSupportInquiry[] }>(
    'listAdminSupportInquiries',
    { environment },
  );
  return (result.inquiries ?? []).map(normalizeSupportInquiry);
}

export async function loadAdminDatabaseStatus(
  environment: DatabaseEnvironment = 'production',
): Promise<DatabaseBackupStatus> {
  const result = await callAdminFunction<{ databaseStatus: DatabaseBackupStatus }>(
    'getAdminDatabaseStatus',
    { environment },
  );
  return result.databaseStatus;
}

export async function startAdminDatabaseRestore(
  backup: DatabaseBackup,
  databaseId: string,
  confirmText: string,
  secondConfirm: boolean,
  environment: DatabaseEnvironment = 'production',
): Promise<DatabaseRestoreOperation> {
  const result = await callAdminFunction<{ restore: DatabaseRestoreOperation }>(
    'startAdminDatabaseRestore',
    {
      backupName: backup.name,
      confirmText,
      databaseId,
      environment,
      secondConfirm,
    },
  );
  return result.restore;
}

export async function answerSupportInquiry(
  inquiry: SupportInquiry,
  answer: string,
  environment: DatabaseEnvironment = 'production',
) {
  if (!inquiry.userId) {
    throw new Error('문의 사용자 ID가 없어 Firebase에 답변을 저장할 수 없어요.');
  }

  await callAdminFunction('answerSupportInquiry', {
    answer,
    environment,
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

function normalizeSupportInquiry(inquiry: RawSupportInquiry): SupportInquiry {
  return {
    ...inquiry,
    attachments: Array.isArray(inquiry.attachments) ? inquiry.attachments : [],
    status: inquiry.status === 'answered' ? 'answered' : 'waiting',
  };
}

function isActionableContentReport(report: ContentReport) {
  const details = report.details.trim();
  const isProfileBlockEvent =
    report.targetType === 'user' &&
    report.reason === 'other' &&
    details.includes('프로필에서 직접 차단');

  return !isProfileBlockEvent;
}
