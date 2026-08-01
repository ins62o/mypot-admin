export type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  provider: 'Kakao' | 'Apple';
  photoURL: string | null;
  pocketCount: number;
  joinedAt: string;
  lastLoginAt: string;
};

export type AdminPocket = {
  id: string;
  name: string;
  memberCount: number;
  recordCount: number;
  level: number;
  createdAt: string;
  status: 'active' | 'pendingDeletion';
};

export type AdminPocketMember = {
  displayName: string;
  id: string;
  joinedAt: string;
  photoURL: string | null;
  statusMessage: string;
};

export type AdminDashboardMetrics = {
  pocketWeeklyDelta: number;
  userWeeklyDelta: number;
};

export type VersionPatchNote = {
  description: string;
  title: string;
};

export type VersionReleaseType = 'major' | 'minor' | 'patch';

export type VersionNote = {
  id: string;
  version: string;
  releasedAt: string;
  releaseType: VersionReleaseType;
  summary: string;
  patches: VersionPatchNote[];
  status: 'draft' | 'published';
};

export type AppUpdateMode = 'optional' | 'required';

export type AppUpdatePlatformConfig = {
  latestVersion: string;
  minimumVersion: string;
  storeUrl: string;
};

export type AppUpdateConfig = {
  buttonLabel: string;
  dismissLabel: string;
  enabled: boolean;
  highlights: string[];
  mode: AppUpdateMode;
  platforms: {
    android: AppUpdatePlatformConfig;
    ios: AppUpdatePlatformConfig;
  };
  publishedAt: string | null;
  schemaVersion: 1;
  summary: string;
  title: string;
};

export type AppUpdateRelease = AppUpdateConfig & {
  id: string;
};

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'extended';

export type MaintenanceConfig = {
  blocksApp: boolean;
  buttonLabel: string;
  enabled: boolean;
  endsAt: string;
  publishedAt: string | null;
  schemaVersion: 1;
  startsAt: string;
  status: MaintenanceStatus;
  statusPageUrl: string;
  summary: string;
  title: string;
};

export type SupportInquiryStatus = 'waiting' | 'answered';

export type SupportAttachment = {
  alt: string;
  fileName: string;
  id: string;
  tone: 'yellow' | 'mint' | 'rose';
  url: string;
};

export type DatabaseBackupStatus = {
  backups: DatabaseBackup[];
  backupSchedules: DatabaseBackupSchedule[];
  databaseId: string;
  deleteProtectionState: string;
  earliestVersionTime: string;
  lastVerifiedAt: string;
  locationId: string;
  pointInTimeRecoveryEnablement: string;
  projectId: string;
  restoreSupported: boolean;
  restoreSummary: string;
};

export type DatabaseBackup = {
  expireTime: string;
  id: string;
  name: string;
  snapshotTime: string;
  state: string;
};

export type DatabaseRestoreOperation = {
  backupName: string;
  databaseId: string;
  operationName: string;
};

export type DatabaseBackupSchedule = {
  id: string;
  name: string;
  recurrence: string;
  retention: string;
};

export type SupportInquiry = {
  id: string;
  userName: string;
  userEmail: string;
  userId?: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  status: SupportInquiryStatus;
  attachments: SupportAttachment[];
  answer?: string;
  answeredAt?: string;
};

