export type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  provider: 'Kakao' | 'Apple';
  photoURL: string | null;
  pocketCount: number;
  joinedAt: string;
  lastLoginAt: string;
  lastLoginAtTimestamp: number | null;
  appVersion: string | null;
  appBuildNumber: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  status: 'active' | 'suspended';
  suspendedUntil: string | null;
  suspensionPermanent: boolean;
};

export type AdminUserPage = {
  totalCount: number;
  users: AdminUser[];
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

export type ModerationAction = 'confirm_violation' | 'dismiss' | 'delete_content' | 'eject_user' | 'delete_and_eject';
export type ContentReport = {
  createdAt: string; details: string; evidence: Record<string, unknown>; id: string;
  pocketId: string; pocketName: string; reason: string; reporterName: string; reporterUid: string;
  resolution?: ModerationAction; resolvedAt?: string; status: 'dismissed' | 'open' | 'resolved';
  targetId: string; targetName: string; targetType: 'chatMessage' | 'feed' | 'user'; targetUid: string;
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
export type AppUpdatePlatform = 'android' | 'ios';
export type AppUpdatePublishTarget = AppUpdatePlatform | 'all';

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
  targetPlatform: AppUpdatePublishTarget;
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
