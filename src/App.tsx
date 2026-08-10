import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Database,
  FileText,
  Inbox,
  ShieldAlert,
  Layers3,
  LoaderCircle,
  MessageCircle,
  RotateCw,
  Smartphone,
  Users,
} from 'lucide-react';

import appIcon from './assets/app-icon.png';
import appleLogo from './assets/social/apple-login.svg';
import kakaoLogo from './assets/social/kakao-login.svg';
import { AdminSearch } from './components/AdminSearch';
import { AppNoticeManagement } from './components/AppNoticeManagement';
import { StatCard } from './components/StatCard';
import type { AdminDashboardMetrics, AdminPocket, AdminPocketMember, AdminUser, AdminUserPage, ContentReport, DatabaseBackup, DatabaseBackupStatus, ModerationAction, SupportInquiry, VersionNote, VersionReleaseType } from './types/admin';
import {
  answerSupportInquiry as answerSupportInquiryRemote,
  deleteAdminVersionNote,
  isFirebaseConfigured,
  loadAdminDashboardMetrics,
  loadAdminContentReports,
  loadAdminDatabaseStatus,
  loadAdminPockets,
  loadAdminPocketMembers,
  loadAdminSupportInquiries,
  loadAdminUsers,
  loadAdminVersionNotes,
  loginAdminWithEmail,
  logoutAdmin,
  resolveAdminContentReport,
  setAdminUserSuspension,
  saveAdminVersionNote,
  startAdminDatabaseRestore,
  subscribeToAdminSession,
  type DatabaseEnvironment,
} from './services/firebaseAdminClient';
import './styles.css';

const PAGE_SIZE = 10;
const REPORT_REASON_LABELS: Record<string, string> = {
  abuse: '괴롭힘 또는 욕설', harassment: '괴롭힘 또는 욕설', hate: '혐오 표현', inappropriate: '부적절한 콘텐츠', other: '기타', sexual: '성적인 콘텐츠', spam: '스팸 또는 광고', violence: '폭력 또는 위협',
};
const DATABASE_ENVIRONMENT_STORAGE_KEY = 'mypot-admin-database-environment';
const ADMIN_LOGIN_ALIAS = 'mypot';
const ADMIN_LOGIN_EMAIL = 'mypot.support@gmail.com';

type AdminPage = 'dashboard' | 'database' | 'moderation' | 'updates' | 'versions' | 'support';
type DataSourceStatus = 'firebase' | 'loading' | 'error';
type EvidenceContentItem = { key: string; value: ReactNode };
type EvidenceRow = { key: string; label: string; value: ReactNode };

const statusLabel = {
  active: '운영중',
  answered: '답변 완료',
  draft: '작성중',
  pendingDeletion: '삭제 대기',
  published: '작성 완료',
  waiting: '답변 대기',
} as const;

const pageTitle: Record<AdminPage, string> = {
  database: 'DB 현황',
  dashboard: '대시보드',
  moderation: '신고 관리',
  support: '1:1 문의',
  updates: '앱 공지 관리',
  versions: '버전 노트',
};

const evidenceFieldLabels: Record<string, string> = {
  authorDisplayName: '작성자',
  authorPhotoURL: '작성자 프로필 사진',
  authorUid: '작성자 계정 ID',
  audioDuration: '음성 길이',
  audioDurationMs: '음성 길이',
  audioDurationSeconds: '음성 길이',
  audioFileURL: '음성 기록',
  audioFileUrl: '음성 기록',
  audioURL: '음성 기록',
  audioUrl: '음성 기록',
  body: '본문',
  commentCount: '댓글 수',
  content: '내용',
  contentType: '콘텐츠 유형',
  createdAt: '작성일',
  displayName: '이름',
  duration: '음성 길이',
  durationMs: '음성 길이',
  durationSeconds: '음성 길이',
  email: '이메일',
  imageURL: '사진',
  imageUrl: '사진',
  imageURLs: '사진',
  imageUrls: '사진',
  mediaUrl: '첨부 미디어',
  mediaUrls: '첨부 미디어',
  mediaType: '콘텐츠 유형',
  message: '메시지',
  photoURL: '프로필 사진',
  photoUrl: '프로필 사진',
  photoUrls: '첨부 사진',
  profileImageUrl: '프로필 사진',
  recordingDuration: '음성 길이',
  recordingDurationMs: '음성 길이',
  recordingDurationSeconds: '음성 길이',
  recordingURL: '음성 기록',
  recordingUrl: '음성 기록',
  text: '내용',
  title: '제목',
  transcript: '음성 변환 내용',
  transcription: '음성 변환 내용',
  uid: '계정 ID',
  updatedAt: '수정일',
  videoDuration: '영상 길이',
  videoDurationMs: '영상 길이',
  videoDurationSeconds: '영상 길이',
  videoFileURL: '영상',
  videoFileURLs: '영상',
  videoFileUrl: '영상',
  videoFileUrls: '영상',
  videoURL: '영상',
  videoURLs: '영상',
  videoUrl: '영상',
  videoUrls: '영상',
  voiceDuration: '음성 길이',
  voiceDurationMs: '음성 길이',
  voiceDurationSeconds: '음성 길이',
  voiceRecordURL: '음성 기록',
  voiceRecordUrl: '음성 기록',
  voiceURL: '음성 기록',
  voiceUrl: '음성 기록',
};

const evidenceFieldOrder = [
  'title',
  'content',
  'text',
  'message',
  'body',
  'transcript',
  'transcription',
  'audioUrl',
  'audioURL',
  'audioFileUrl',
  'audioFileURL',
  'voiceUrl',
  'voiceURL',
  'voiceRecordUrl',
  'voiceRecordURL',
  'recordingUrl',
  'recordingURL',
  'videoUrl',
  'videoURL',
  'videoUrls',
  'videoURLs',
  'videoFileUrl',
  'videoFileURL',
  'videoFileUrls',
  'videoFileURLs',
  'fileUrl',
  'fileURL',
  'fileUrls',
  'fileURLs',
  'attachmentUrl',
  'attachmentURL',
  'attachmentUrls',
  'attachmentURLs',
  'media',
  'mediaUrl',
  'mediaUrls',
  'mediaFile',
  'mediaFiles',
  'attachments',
  'files',
  'assets',
  'audioDuration',
  'audioDurationMs',
  'audioDurationSeconds',
  'voiceDuration',
  'voiceDurationMs',
  'voiceDurationSeconds',
  'recordingDuration',
  'recordingDurationMs',
  'recordingDurationSeconds',
  'duration',
  'durationMs',
  'durationSeconds',
  'videoDuration',
  'videoDurationMs',
  'videoDurationSeconds',
  'authorDisplayName',
  'displayName',
  'authorUid',
  'uid',
  'email',
  'commentCount',
  'imageUrls',
  'imageURLs',
  'imageUrl',
  'imageURL',
  'photoUrls',
  'photoUrl',
  'photoURL',
  'profileImageUrl',
  'authorPhotoURL',
  'mediaType',
  'contentType',
  'createdAt',
  'updatedAt',
] as const;

const emptyContentKeys = new Set(['body', 'content', 'message', 'text']);
const evidenceContentTextKeys = ['title', 'content', 'text', 'message', 'body', 'transcript', 'transcription'] as const;
const evidenceContentMediaKeys = [
  'audioUrl',
  'audioURL',
  'audioFileUrl',
  'audioFileURL',
  'voiceUrl',
  'voiceURL',
  'voiceRecordUrl',
  'voiceRecordURL',
  'recordingUrl',
  'recordingURL',
  'videoUrl',
  'videoURL',
  'videoUrls',
  'videoURLs',
  'videoFileUrl',
  'videoFileURL',
  'videoFileUrls',
  'videoFileURLs',
  'fileUrl',
  'fileURL',
  'fileUrls',
  'fileURLs',
  'attachmentUrl',
  'attachmentURL',
  'attachmentUrls',
  'attachmentURLs',
  'imageUrls',
  'imageURLs',
  'imageUrl',
  'imageURL',
  'photoUrls',
  'media',
  'mediaUrl',
  'mediaUrls',
  'mediaFile',
  'mediaFiles',
  'attachments',
  'files',
  'assets',
] as const;
const hiddenEvidenceKeys = new Set([
  'createdWeekKey',
  'authorUid',
  'authorPhotoURL',
  'commentCount',
  'email',
  'id',
  'metadata',
  'photoURL',
  'photoUrl',
  'pocketId',
  'profileImageUrl',
  'searchKeywords',
  'sortKey',
  'targetId',
  'uid',
  'updatedWeekKey',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isAudioTypeValue(value: unknown) {
  return typeof value === 'string' && /audio|voice|recording|음성/i.test(value);
}

function isImageTypeValue(value: unknown) {
  return typeof value === 'string' && /image|photo|picture|사진|이미지/i.test(value);
}

function isVideoTypeValue(value: unknown) {
  return typeof value === 'string' && /video|movie|영상|동영상/i.test(value);
}

function isMediaTypeFieldKey(key: string) {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('mimetype') ||
    lowerKey === 'attachmenttype' ||
    lowerKey === 'assettype' ||
    lowerKey === 'contentkind' ||
    lowerKey === 'contenttype' ||
    lowerKey === 'filetype' ||
    lowerKey === 'mediakind' ||
    lowerKey === 'mediatype' ||
    lowerKey === 'mime' ||
    lowerKey === 'mimetype' ||
    lowerKey === 'posttype' ||
    lowerKey === 'recordtype' ||
    lowerKey === 'type'
  );
}

function isAudioEvidenceKey(key: string) {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('audio') ||
    lowerKey.includes('voice') ||
    lowerKey.includes('recording') ||
    lowerKey === 'recordurl' ||
    lowerKey === 'recordurls' ||
    lowerKey === 'recordfileurl' ||
    lowerKey === 'recordfileurls'
  );
}

function isContentImageEvidenceKey(key: string) {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey === 'imageurl' ||
    lowerKey === 'imageurls' ||
    lowerKey === 'images' ||
    lowerKey === 'image' ||
    lowerKey === 'photourls' ||
    lowerKey === 'photos'
  );
}

function isImageEvidenceKey(key: string) {
  const lowerKey = key.toLowerCase();
  return isContentImageEvidenceKey(key) || lowerKey.includes('image') || lowerKey.includes('photo');
}

function isProfileImageEvidenceKey(key: string) {
  const lowerKey = key.toLowerCase();
  const hasImageHint = lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('picture') || lowerKey.includes('url');
  return (
    lowerKey.includes('avatar') ||
    lowerKey.includes('profile') ||
    (lowerKey.includes('author') && hasImageHint) ||
    (lowerKey.includes('writer') && hasImageHint) ||
    (lowerKey.includes('sender') && hasImageHint) ||
    (lowerKey.includes('user') && lowerKey.includes('profile') && hasImageHint)
  );
}

function isVideoEvidenceKey(key: string) {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('clip') || lowerKey.includes('movie') || lowerKey.includes('video');
}

function isGenericMediaValueKey(key: string) {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('asset') ||
    lowerKey.includes('attachment') ||
    lowerKey.includes('downloadurl') ||
    lowerKey.includes('file') ||
    lowerKey.includes('media') ||
    lowerKey.includes('storageurl') ||
    lowerKey === 'url' ||
    lowerKey === 'urls' ||
    lowerKey === 'uri' ||
    lowerKey === 'uris'
  );
}

function isAudioDurationKey(key: string) {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('duration') && (lowerKey.includes('audio') || lowerKey.includes('voice') || lowerKey.includes('recording') || lowerKey === 'duration' || lowerKey === 'durationms' || lowerKey === 'durationseconds');
}

function isVideoDurationKey(key: string) {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('duration') && (lowerKey.includes('video') || lowerKey.includes('movie'));
}

function isDurationKey(key: string) {
  return key.toLowerCase().includes('duration');
}

function hasMeaningfulEvidenceValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulEvidenceValue);
  if (isRecord(value)) return Object.values(value).some(hasMeaningfulEvidenceValue);
  return true;
}

function hasEvidenceMediaType(evidence: Record<string, unknown>, matcher: (value: unknown) => boolean) {
  return Object.entries(evidence).some(([key, value]) => isMediaTypeFieldKey(key) && matcher(value));
}

function hasAudioEvidence(evidence: Record<string, unknown>) {
  const hasExplicitImageOrVideoType = hasEvidenceMediaType(evidence, isImageTypeValue) || hasEvidenceMediaType(evidence, isVideoTypeValue);
  return Object.entries(evidence).some(([key, value]) => {
    if (isAudioEvidenceKey(key) && hasMeaningfulEvidenceValue(value)) return true;
    if (isMediaTypeFieldKey(key) && isAudioTypeValue(value)) return true;
    if (!hasExplicitImageOrVideoType && isGenericMediaValueKey(key) && valueContainsMediaKind(value, 'audio')) return true;
    return false;
  });
}

function hasImageEvidence(evidence: Record<string, unknown>) {
  const hasExplicitAudioOrVideoType = hasEvidenceMediaType(evidence, isAudioTypeValue) || hasEvidenceMediaType(evidence, isVideoTypeValue);
  return Object.entries(evidence).some(([key, value]) => {
    if (isProfileImageEvidenceKey(key)) return false;
    if (isContentImageEvidenceKey(key) && hasMeaningfulEvidenceValue(value)) return true;
    if (isMediaTypeFieldKey(key) && isImageTypeValue(value)) return true;
    if (!hasExplicitAudioOrVideoType && isGenericMediaValueKey(key) && valueContainsMediaKind(value, 'image')) return true;
    return false;
  });
}

function hasVideoEvidence(evidence: Record<string, unknown>) {
  const hasExplicitAudioOrImageType = hasEvidenceMediaType(evidence, isAudioTypeValue) || hasEvidenceMediaType(evidence, isImageTypeValue);
  return Object.entries(evidence).some(([key, value]) => {
    if (isVideoEvidenceKey(key) && hasMeaningfulEvidenceValue(value)) return true;
    if (isMediaTypeFieldKey(key) && isVideoTypeValue(value)) return true;
    if (!hasExplicitAudioOrImageType && isGenericMediaValueKey(key) && valueContainsMediaKind(value, 'video')) return true;
    return false;
  });
}

function hasMediaAttachmentEvidence(evidence: Record<string, unknown>) {
  return Object.entries(evidence).some(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (!hasMeaningfulEvidenceValue(value)) return false;
    if (isProfileImageEvidenceKey(key)) return false;
    if (isAudioEvidenceKey(key) || isContentImageEvidenceKey(key) || isVideoEvidenceKey(key)) return true;
    if (isGenericMediaValueKey(key) && (hasAudioEvidence(evidence) || hasImageEvidence(evidence) || hasVideoEvidence(evidence) || valueContainsAnyMediaKind(value))) return true;
    return false;
  });
}

function getUrlMediaKind(url: string): 'audio' | 'image' | 'video' | null {
  const pathname = url.split(/[?#]/)[0].toLowerCase();
  if (/\.(aac|aif|aiff|flac|m4a|mp3|ogg|opus|wav)$/.test(pathname)) return 'audio';
  if (/\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/.test(pathname)) return 'image';
  if (/\.(3gp|m4v|mov|mp4|mpeg|mpg|ogv|webm)$/.test(pathname)) return 'video';
  return null;
}

function valueContainsMediaKind(value: unknown, kind: 'audio' | 'image' | 'video'): boolean {
  if (typeof value === 'string') return isUrl(value.trim()) && getUrlMediaKind(value.trim()) === kind;
  if (Array.isArray(value)) return value.some((item) => valueContainsMediaKind(item, kind));
  if (isRecord(value)) {
    return Object.entries(value).some(([key, item]) => {
      if (isMediaTypeFieldKey(key)) {
        if (kind === 'audio') return isAudioTypeValue(item);
        if (kind === 'image') return isImageTypeValue(item);
        return isVideoTypeValue(item);
      }

      if (kind === 'audio' && isAudioEvidenceKey(key) && hasMeaningfulEvidenceValue(item)) return true;
      if (kind === 'image' && isContentImageEvidenceKey(key) && hasMeaningfulEvidenceValue(item)) return true;
      if (kind === 'video' && isVideoEvidenceKey(key) && hasMeaningfulEvidenceValue(item)) return true;

      return isGenericMediaValueKey(key) && valueContainsMediaKind(item, kind);
    });
  }
  return false;
}

function valueContainsAnyMediaKind(value: unknown) {
  return valueContainsMediaKind(value, 'audio') || valueContainsMediaKind(value, 'image') || valueContainsMediaKind(value, 'video');
}

function shouldRenderAudioValue(key: string, evidence?: Record<string, unknown>) {
  const lowerKey = key.toLowerCase();
  const value = evidence?.[key];
  if (isGenericMediaValueKey(key) && evidence && (hasImageEvidence(evidence) || hasVideoEvidence(evidence))) return false;
  return isAudioEvidenceKey(key) || valueContainsMediaKind(value, 'audio') || (isGenericMediaValueKey(key) && Boolean(evidence && hasAudioEvidence(evidence)));
}

function shouldRenderImageValue(key: string, evidence?: Record<string, unknown>) {
  const value = evidence?.[key];
  if (isProfileImageEvidenceKey(key)) return false;
  if (isGenericMediaValueKey(key) && evidence && (hasAudioEvidence(evidence) || hasVideoEvidence(evidence))) return false;
  return isImageEvidenceKey(key) || valueContainsMediaKind(value, 'image') || (isGenericMediaValueKey(key) && Boolean(evidence && hasImageEvidence(evidence)));
}

function shouldRenderVideoValue(key: string, evidence?: Record<string, unknown>) {
  const value = evidence?.[key];
  if (isGenericMediaValueKey(key) && evidence && (hasAudioEvidence(evidence) || hasImageEvidence(evidence))) return false;
  return isVideoEvidenceKey(key) || valueContainsMediaKind(value, 'video') || (isGenericMediaValueKey(key) && Boolean(evidence && hasVideoEvidence(evidence)));
}

function formatEvidenceDate(value: unknown) {
  const timestamp = getEvidenceTimestamp(value);
  return timestamp === null ? null : new Date(timestamp).toLocaleString('ko-KR');
}

function getEvidenceTimestamp(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (isRecord(value) && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }

  return null;
}

function evidenceLinkLabel(key: string, index?: number) {
  const countLabel = typeof index === 'number' ? ` ${index + 1}` : '';
  const lowerKey = key.toLowerCase();
  if (isAudioEvidenceKey(key)) return `음성${countLabel} 듣기`;
  if (isVideoEvidenceKey(key)) return `영상${countLabel} 보기`;
  if (lowerKey.includes('image') || lowerKey.includes('photo')) return `사진${countLabel} 보기`;
  if (lowerKey.includes('media')) return `미디어${countLabel} 보기`;
  return `링크${countLabel} 열기`;
}

function findUrlInRecord(record: Record<string, unknown>) {
  const urlKeys = ['url', 'uri', 'downloadUrl', 'downloadURL', 'fileUrl', 'fileURL', 'audioUrl', 'audioURL', 'voiceUrl', 'voiceURL', 'imageUrl', 'imageURL', 'photoUrl', 'photoURL', 'videoUrl', 'videoURL', 'mediaUrl', 'mediaURL', 'storageUrl', 'storageURL'];
  for (const key of urlKeys) {
    const value = record[key];
    const url = findUrlInValue(value);
    if (url) return url;
  }

  for (const value of Object.values(record)) {
    const url = findUrlInValue(value);
    if (url) return url;
  }

  return null;
}

function findUrlInValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return isUrl(trimmed) ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findUrlInValue(item);
      if (url) return url;
    }
  }

  if (isRecord(value)) {
    return findUrlInRecord(value);
  }

  return null;
}

function findDurationInRecord(record: Record<string, unknown>) {
  const durationKeys = ['duration', 'durationMs', 'durationSeconds', 'audioDuration', 'audioDurationMs', 'audioDurationSeconds', 'voiceDuration', 'voiceDurationMs', 'voiceDurationSeconds', 'recordingDuration', 'recordingDurationMs', 'recordingDurationSeconds', 'videoDuration', 'videoDurationMs', 'videoDurationSeconds'];
  for (const key of durationKeys) {
    const duration = formatEvidenceDuration(key, record[key]);
    if (duration) return duration;
  }

  return null;
}

function formatEvidenceDuration(key: string, value: unknown) {
  if (!isDurationKey(key)) return null;

  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numericValue)) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  const lowerKey = key.toLowerCase();
  const seconds = lowerKey.includes('ms') ? Math.round(numericValue / 1000) : Math.round(numericValue);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}초`;
  if (remainingSeconds === 0) return `${minutes}분`;
  return `${minutes}분 ${remainingSeconds}초`;
}

function ImageEvidenceValue({ index, url }: { index?: number; url: string }) {
  return <a className="evidenceImageValue" href={url} rel="noreferrer" target="_blank">
    <img src={url} alt={evidenceLinkLabel('imageUrl', index)} loading="lazy" />
    <span>{evidenceLinkLabel('imageUrl', index)}</span>
  </a>;
}

function VideoEvidenceValue({ url }: { url: string }) {
  return <div className="evidenceVideoValue">
    <video controls preload="metadata" src={url}>
      <a href={url} rel="noreferrer" target="_blank">영상 보기</a>
    </video>
  </div>;
}

function AudioEvidenceValue({ duration, index, url }: { duration?: string | null; index?: number; url: string }) {
  return <div className="evidenceAudioValue">
    <audio controls preload="none" src={url}>
      <a href={url} rel="noreferrer" target="_blank">{evidenceLinkLabel('audioUrl', index)}</a>
    </audio>
    {duration ? <small>{duration}</small> : null}
  </div>;
}

function formatImageEvidenceValue(key: string, value: unknown, index?: number): ReactNode | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isUrl(trimmed)) return <ImageEvidenceValue index={index} url={trimmed} />;
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item, itemIndex) => formatImageEvidenceValue(key, item, itemIndex))
      .filter((item): item is ReactNode => item !== null);

    return items.length ? <div className="evidenceValueList">{items.map((item, itemIndex) => <div key={`${key}-${itemIndex}`}>{item}</div>)}</div> : null;
  }

  if (isRecord(value)) {
    const imageUrl = findUrlInRecord(value);
    if (imageUrl) return <ImageEvidenceValue index={index} url={imageUrl} />;
  }

  return null;
}

function formatVideoEvidenceValue(key: string, value: unknown, index?: number): ReactNode | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isUrl(trimmed)) return <VideoEvidenceValue url={trimmed} />;
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item, itemIndex) => formatVideoEvidenceValue(key, item, itemIndex))
      .filter((item): item is ReactNode => item !== null);

    return items.length ? <div className="evidenceValueList">{items.map((item, itemIndex) => <div key={`${key}-${itemIndex}`}>{item}</div>)}</div> : null;
  }

  if (isRecord(value)) {
    const videoUrl = findUrlInRecord(value);
    if (videoUrl) {
      return <VideoEvidenceValue url={videoUrl} />;
    }
  }

  return null;
}

function formatAudioEvidenceValue(key: string, value: unknown, index?: number): ReactNode | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isUrl(trimmed)) return <AudioEvidenceValue index={index} url={trimmed} />;
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item, itemIndex) => formatAudioEvidenceValue(key, item, itemIndex))
      .filter((item): item is ReactNode => item !== null);

    return items.length ? <div className="evidenceValueList">{items.map((item, itemIndex) => <div key={`${key}-${itemIndex}`}>{item}</div>)}</div> : null;
  }

  if (isRecord(value)) {
    const audioUrl = findUrlInRecord(value);
    if (audioUrl) {
      return <AudioEvidenceValue duration={findDurationInRecord(value)} index={index} url={audioUrl} />;
    }
  }

  return null;
}

function formatEvidenceValue(key: string, value: unknown, index?: number, evidence?: Record<string, unknown>): ReactNode | null {
  if (value === null || value === undefined) return null;

  if (shouldRenderAudioValue(key, evidence)) {
    return formatAudioEvidenceValue(key, value, index);
  }

  if (shouldRenderVideoValue(key, evidence)) {
    return formatVideoEvidenceValue(key, value, index);
  }

  if (shouldRenderImageValue(key, evidence)) {
    return formatImageEvidenceValue(key, value, index);
  }

  const durationValue = formatEvidenceDuration(key, value);
  if (durationValue) return durationValue;

  const dateValue = key.endsWith('At') ? formatEvidenceDate(value) : null;
  if (dateValue) return dateValue;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return emptyContentKeys.has(key) ? <span className="emptyEvidenceValue">내용 없음</span> : null;
    }
    if (isUrl(trimmed)) {
      return <a className="evidenceLink" href={trimmed} rel="noreferrer" target="_blank">{evidenceLinkLabel(key, index)}</a>;
    }
    return trimmed;
  }

  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  if (typeof value === 'boolean') return value ? '예' : '아니요';

  if (Array.isArray(value)) {
    const items = value
      .map((item, itemIndex) => formatEvidenceValue(key, item, itemIndex, evidence))
      .filter((item): item is ReactNode => item !== null);

    return items.length ? <div className="evidenceValueList">{items.map((item, itemIndex) => <div key={`${key}-${itemIndex}`}>{item}</div>)}</div> : null;
  }

  if (isRecord(value)) {
    const nestedRows = buildEvidenceRows(value);
    return nestedRows.length ? <dl className="evidenceNestedRows">{nestedRows.map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : null;
  }

  return String(value);
}

function getEvidenceFieldLabel(key: string, evidence: Record<string, unknown>) {
  if (shouldRenderAudioValue(key, evidence)) return '음성 기록';
  if (shouldRenderVideoValue(key, evidence)) return '영상';
  if (shouldRenderImageValue(key, evidence)) return evidenceFieldLabels[key] ?? '사진';
  if (isDurationKey(key) && hasVideoEvidence(evidence)) return '영상 길이';
  if (isDurationKey(key) && hasAudioEvidence(evidence)) return '음성 길이';
  if (isVideoDurationKey(key)) return '영상 길이';
  if (isAudioDurationKey(key)) return '음성 길이';
  if (isAudioTypeValue(evidence[key]) || isImageTypeValue(evidence[key]) || isVideoTypeValue(evidence[key])) return '콘텐츠 유형';
  return evidenceFieldLabels[key] ?? null;
}

function shouldHideEvidenceRow(key: string, value: unknown, evidence: Record<string, unknown>, targetName?: string) {
  if (hiddenEvidenceKeys.has(key)) return true;
  if (isProfileImageEvidenceKey(key)) return true;

  if (
    emptyContentKeys.has(key) &&
    typeof value === 'string' &&
    !value.trim() &&
    hasMediaAttachmentEvidence(evidence)
  ) {
    return true;
  }

  if (
    isMediaTypeFieldKey(key) &&
    (isAudioTypeValue(value) || isImageTypeValue(value) || isVideoTypeValue(value)) &&
    hasMediaAttachmentEvidence(evidence)
  ) {
    return true;
  }

  const normalizedTargetName = targetName?.trim();
  if (
    normalizedTargetName &&
    (key === 'authorDisplayName' || key === 'displayName') &&
    typeof value === 'string' &&
    value.trim() === normalizedTargetName
  ) {
    return true;
  }

  if (key === 'updatedAt') {
    const updatedAt = getEvidenceTimestamp(value);
    const createdAt = getEvidenceTimestamp(evidence.createdAt);
    return updatedAt !== null && createdAt !== null && updatedAt === createdAt;
  }

  return false;
}

function buildEvidenceRows(evidence: Record<string, unknown>, targetName?: string): EvidenceRow[] {
  const displayedKeys = new Set<string>();
  const orderedKeys = [
    ...evidenceFieldOrder.filter(key => Object.prototype.hasOwnProperty.call(evidence, key)),
    ...Object.keys(evidence).filter(key => !evidenceFieldOrder.includes(key as typeof evidenceFieldOrder[number])),
  ];

  return orderedKeys.reduce<EvidenceRow[]>((rows, key) => {
    if (displayedKeys.has(key) || shouldHideEvidenceRow(key, evidence[key], evidence, targetName)) return rows;

    const label = getEvidenceFieldLabel(key, evidence);
    if (!label) return rows;

    const value = formatEvidenceValue(key, evidence[key], undefined, evidence);
    if (value === null) return rows;

    displayedKeys.add(key);
    rows.push({ key, label, value });
    return rows;
  }, []);
}

function getEvidenceContentTypeLabels(evidence: Record<string, unknown>) {
  const labels: string[] = [];

  if (hasAudioEvidence(evidence)) labels.push('음성');
  if (hasVideoEvidence(evidence)) labels.push('영상');
  if (hasImageEvidence(evidence)) labels.push('사진');

  if (!labels.length && evidenceContentTextKeys.some((key) => hasMeaningfulEvidenceValue(evidence[key]))) {
    labels.push('텍스트');
  }

  return labels.length ? labels : ['게시물'];
}

function buildEvidenceContentItems(evidence: Record<string, unknown>): EvidenceContentItem[] {
  const items: EvidenceContentItem[] = [];
  const displayedKeys = new Set<string>();

  evidenceContentTextKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(evidence, key) || !hasMeaningfulEvidenceValue(evidence[key])) {
      return;
    }

    const value = formatEvidenceValue(key, evidence[key], undefined, evidence);
    if (value === null) return;

    displayedKeys.add(key);
    items.push({ key, value });
  });

  evidenceContentMediaKeys.forEach((key) => {
    if (
      displayedKeys.has(key) ||
      !Object.prototype.hasOwnProperty.call(evidence, key) ||
      !hasMeaningfulEvidenceValue(evidence[key])
    ) {
      return;
    }

    const value = formatEvidenceValue(key, evidence[key], undefined, evidence);
    if (value === null) return;

    displayedKeys.add(key);
    items.push({ key, value });
  });

  Object.keys(evidence).forEach((key) => {
    if (
      displayedKeys.has(key) ||
      hiddenEvidenceKeys.has(key) ||
      evidenceContentTextKeys.includes(key as typeof evidenceContentTextKeys[number]) ||
      !hasMeaningfulEvidenceValue(evidence[key]) ||
      (!shouldRenderAudioValue(key, evidence) && !shouldRenderVideoValue(key, evidence) && !shouldRenderImageValue(key, evidence))
    ) {
      return;
    }

    const value = formatEvidenceValue(key, evidence[key], undefined, evidence);
    if (value === null) return;

    displayedKeys.add(key);
    items.push({ key, value });
  });

  return items;
}

function EvidenceSummary({ createdAt, evidence }: { createdAt?: string; evidence: Record<string, unknown> }) {
  const contentItems = buildEvidenceContentItems(evidence);
  const createdAtLabel = formatEvidenceDate(evidence.createdAt) ?? formatEvidenceDate(createdAt) ?? '-';
  const typeLabels = getEvidenceContentTypeLabels(evidence);

  return <div className="evidenceSummary">
    <div className="evidenceSummaryMeta">
      <div>
        <span>작성일</span>
        <strong>{createdAtLabel}</strong>
      </div>
      <div>
        <span>유형</span>
        <div className="evidenceTypeTags">
          {typeLabels.map((label) => <span className="evidenceTypeTag" key={label}>{label}</span>)}
        </div>
      </div>
    </div>
    <section className="evidenceContentSection">
      <span>내용</span>
      <div className="evidenceContentValue">
        {contentItems.length ? (
          contentItems.map((item) => <div className="evidenceContentItem" key={item.key}>{item.value}</div>)
        ) : (
          <span className="emptyEvidenceValue">내용 없음</span>
        )}
      </div>
    </section>
  </div>;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [registeredUserCount, setRegisteredUserCount] = useState(0);
  const [pockets, setPockets] = useState<AdminPocket[]>([]);
  const [versionNotes, setVersionNotes] = useState<VersionNote[]>(() =>
    ensureVersionNoteDraft([]),
  );
  const [supportInquiries, setSupportInquiries] = useState<SupportInquiry[]>([]);
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');
  const [firebaseStatusMessage, setFirebaseStatusMessage] = useState('운영 Firebase 연결 대기 중');
  const [databaseDataSourceStatus, setDatabaseDataSourceStatus] =
    useState<DataSourceStatus>('loading');
  const [databaseStatusMessage, setDatabaseStatusMessage] =
    useState('연결 중');
  const [databaseBackupStatus, setDatabaseBackupStatus] =
    useState<DatabaseBackupStatus | null>(null);
  const [databaseEnvironment, setDatabaseEnvironment] =
    useState<DatabaseEnvironment>(() => {
      try {
        const savedEnvironment = window.localStorage.getItem(
          DATABASE_ENVIRONMENT_STORAGE_KEY,
        );
        return savedEnvironment === 'development' ? 'development' : 'production';
      } catch {
        return 'production';
      }
    });
  const [dashboardMetrics, setDashboardMetrics] =
    useState<AdminDashboardMetrics>({ pocketWeeklyDelta: 0, userWeeklyDelta: 0 });
  const [loadedDashboardEnvironment, setLoadedDashboardEnvironment] =
    useState<DatabaseEnvironment | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState('version_1.0.0');

  const activePocketCount = pockets.filter(
    (pocketItem) => pocketItem.status === 'active',
  ).length;
  const pendingDeletionPocketCount = pockets.filter(
    (pocketItem) => pocketItem.status === 'pendingDeletion',
  ).length;
  const selectedVersion =
    versionNotes.find((note) => note.id === selectedVersionId) ??
    versionNotes[0] ??
    null;
  const waitingInquiryCount = supportInquiries.filter(
    (inquiry) => inquiry.status === 'waiting',
  ).length;
  const openReportCount = contentReports.filter((report) => report.status === 'open').length;
  const reportCountByUserId = useMemo(
    () => buildReportCountByUserId(contentReports),
    [contentReports],
  );

  useEffect(() => {
    return subscribeToAdminSession((user) => {
      setIsAuthenticated(Boolean(user));
      if (!user) {
        setLoadedDashboardEnvironment(null);
      }
      setIsCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    const environmentLabel = databaseEnvironment === 'production' ? '운영' : '개발';
    setDataSourceStatus('loading');
    setFirebaseStatusMessage(`${environmentLabel} Firebase 데이터 불러오는 중`);
    const usersRequest = loadAdminUsers(databaseEnvironment, {
      page: 1,
      pageSize: PAGE_SIZE,
      query: '',
      status: 'all',
    });
    const pocketsRequest = loadAdminPockets(databaseEnvironment);

    Promise.allSettled([usersRequest, pocketsRequest]).then(
      ([loadedUsers, loadedPockets]) => {
        if (!isMounted) {
          return;
        }

        if (loadedUsers.status === 'fulfilled') {
          setUsers(loadedUsers.value.users);
          setUserTotalCount(loadedUsers.value.totalCount);
          setRegisteredUserCount(loadedUsers.value.totalCount);
        } else {
          setUsers([]);
        }

        if (loadedPockets.status === 'fulfilled') {
          setPockets(loadedPockets.value);
        } else {
          setPockets([]);
        }

        setLoadedDashboardEnvironment(databaseEnvironment);
      },
    );

    Promise.allSettled([
      usersRequest,
      pocketsRequest,
      loadAdminVersionNotes(databaseEnvironment),
      loadAdminSupportInquiries(databaseEnvironment),
      loadAdminDashboardMetrics(databaseEnvironment),
      loadAdminContentReports(databaseEnvironment),
    ]).then(([loadedUsers, loadedPockets, loadedNotes, loadedInquiries, loadedMetrics, loadedReports]) => {
      if (!isMounted) {
        return;
      }

      if (loadedUsers.status === 'fulfilled') {
        setUsers(loadedUsers.value.users);
        setUserTotalCount(loadedUsers.value.totalCount);
        setRegisteredUserCount(loadedUsers.value.totalCount);
      }
      if (loadedPockets.status === 'fulfilled') {
        setPockets(loadedPockets.value);
      }
      if (loadedNotes.status === 'fulfilled') {
        const notesWithDraft = ensureVersionNoteDraft(loadedNotes.value);
        setVersionNotes(notesWithDraft);
        setSelectedVersionId(
          notesWithDraft.find((note) => note.status === 'draft')?.id ??
            notesWithDraft[0]?.id ??
            '',
        );
      } else {
        const fallbackNotes = ensureVersionNoteDraft([]);
        setVersionNotes(fallbackNotes);
        setSelectedVersionId(fallbackNotes[0].id);
      }
      if (loadedInquiries.status === 'fulfilled') {
        setSupportInquiries(loadedInquiries.value);
      } else {
        setSupportInquiries([]);
      }
      if (loadedMetrics.status === 'fulfilled') {
        setDashboardMetrics(loadedMetrics.value);
      }
      if (loadedReports.status === 'fulfilled') setContentReports(loadedReports.value);

      if (loadedUsers.status === 'rejected' || loadedPockets.status === 'rejected') {
        setUsers([]);
        setPockets([]);
        setDataSourceStatus('error');
        setFirebaseStatusMessage(`${environmentLabel} Firebase 데이터 호출 실패`);
        return;
      }

      if (loadedInquiries.status === 'rejected') {
        setDataSourceStatus('error');
        setFirebaseStatusMessage(`${environmentLabel} Firebase 문의 호출 실패`);
        return;
      }

      setDataSourceStatus('firebase');
      setFirebaseStatusMessage(`${environmentLabel} Firebase 연결됨`);
    });

    return () => {
      isMounted = false;
    };
  }, [databaseEnvironment, isAuthenticated]);

  function handleDatabaseEnvironmentChange(environment: DatabaseEnvironment) {
    setDatabaseEnvironment(environment);
    try {
      window.localStorage.setItem(DATABASE_ENVIRONMENT_STORAGE_KEY, environment);
    } catch {
      // 환경 선택은 브라우저 저장소를 사용할 수 없어도 현재 세션에서 유지됩니다.
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured || page !== 'support') {
      return;
    }

    let isMounted = true;

    loadAdminSupportInquiries(databaseEnvironment)
      .then((inquiries) => {
        if (isMounted) {
          setSupportInquiries(inquiries);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSupportInquiries([]);
          setDataSourceStatus('error');
          setFirebaseStatusMessage(
            `${databaseEnvironment === 'production' ? '운영' : '개발'} Firebase 문의 호출 실패`,
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [databaseEnvironment, isAuthenticated, page]);

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    setDatabaseBackupStatus(null);
    setDatabaseDataSourceStatus('loading');
    setDatabaseStatusMessage('연결 중');

    loadAdminDatabaseStatus(databaseEnvironment)
      .then((databaseStatus) => {
        if (!isMounted) return;
        setDatabaseBackupStatus(databaseStatus);
        setDatabaseDataSourceStatus('firebase');
        setDatabaseStatusMessage('연결');
      })
      .catch(() => {
        if (!isMounted) return;
        setDatabaseDataSourceStatus('error');
        setDatabaseStatusMessage('연결 실패');
      });

    return () => {
      isMounted = false;
    };
  }, [databaseEnvironment, isAuthenticated]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFirebaseConfigured) {
      setLoginError('운영 Firebase 환경 변수가 설정되지 않았어요.');
      return;
    }

    try {
      setLoginError('');
      const normalizedLoginId = loginId.trim();
      const email =
        normalizedLoginId.toLowerCase() === ADMIN_LOGIN_ALIAS
          ? ADMIN_LOGIN_EMAIL
          : normalizedLoginId;
      await loginAdminWithEmail(email, loginPassword);
      setLoginPassword('');
    } catch {
      setLoginError('Firebase 이메일 또는 비밀번호를 확인해 주세요.');
    }
  }

  if (
    isCheckingSession ||
    (isAuthenticated && loadedDashboardEnvironment !== databaseEnvironment)
  ) {
    return (
      <main className="loginPage">
        <div
          className="sessionLoader"
          aria-label={isCheckingSession ? '관리자 접근 확인 중' : '대시보드 데이터 불러오는 중'}
        />
      </main>
    );
  }
  if (!isAuthenticated) {
    return (
      <main className="loginPage">
        <form className="loginCard" onSubmit={handleLoginSubmit}>
          <div className="loginBrandMark">
            <img src={appIcon} alt="마이폿" />
          </div>
          <div className="loginHeader">
            <h1>마이폿 관리자</h1>
          </div>

          <label>
            아이디 또는 이메일
            <input
              autoComplete="username"
              value={loginId}
              onChange={(event) => {
                setLoginId(event.target.value);
                setLoginError('');
              }}
            />
          </label>

          <label>
            비밀번호
            <input
              autoComplete="current-password"
              type="password"
              value={loginPassword}
              onChange={(event) => {
                setLoginPassword(event.target.value);
                setLoginError('');
              }}
            />
          </label>

          {loginError ? <p className="loginError">{loginError}</p> : null}

          <button className="loginButton" type="submit">
            로그인
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brandBlock">
          <div className="brandMark appIconMark">
            <img src={appIcon} alt="마이폿" />
          </div>
          <div>
            <strong>마이폿 관리자</strong>
            <span className={`consoleTag ${databaseEnvironment}`}>
              {databaseEnvironment === 'development' ? '개발 콘솔' : '운영 콘솔'}
            </span>
          </div>
        </div>

        <nav className="navList" aria-label="관리자 메뉴">
          <section className="navGroup" aria-label="개요">
            <p className="navGroupLabel">개요</p>
            <button
              className={page === 'dashboard' ? 'active' : ''}
              type="button"
              onClick={() => setPage('dashboard')}
            >
              <span className="navIcon"><Database size={18} /></span>
              <span>대시보드</span>
            </button>
          </section>

          <section className="navGroup" aria-label="운영 관리">
            <p className="navGroupLabel">운영 관리</p>
            <button className={page === 'moderation' ? 'active' : ''} type="button" onClick={() => setPage('moderation')}>
              <span className="navIcon"><ShieldAlert size={18} /></span><span>신고 관리</span>
              {openReportCount > 0 ? <span className="navCount">{openReportCount}</span> : null}
            </button>
            <button
              className={page === 'updates' ? 'active' : ''}
              type="button"
              onClick={() => setPage('updates')}
            >
              <span className="navIcon"><Smartphone size={18} /></span>
              <span>앱 공지 관리</span>
            </button>
            <button
              className={page === 'versions' ? 'active' : ''}
              type="button"
              onClick={() => setPage('versions')}
            >
              <span className="navIcon"><FileText size={18} /></span>
              <span>버전 노트</span>
            </button>
            <button
              className={page === 'support' ? 'active' : ''}
              type="button"
              onClick={() => setPage('support')}
            >
              <span className="navIcon"><Inbox size={18} /></span>
              <span>1:1 문의</span>
              {waitingInquiryCount > 0 ? (
                <span className="navCount">{waitingInquiryCount}</span>
              ) : null}
            </button>
          </section>

          <section className="navGroup navGroupSystem" aria-label="시스템">
            <p className="navGroupLabel">시스템</p>
            <button
              className={page === 'database' ? 'active' : ''}
              type="button"
              onClick={() => setPage('database')}
            >
              <span className="navIcon"><RotateCw size={18} /></span>
              <span>DB 현황</span>
            </button>
          </section>
        </nav>
      </aside>

      <main className="mainArea">
        <header className="topBar" id="dashboard">
          <div>
            <h1>{pageTitle[page]}</h1>
          </div>
          <button
            className="logoutButton"
            type="button"
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            로그아웃
          </button>
        </header>

        {page === 'dashboard' ? (
          <DashboardPage
            activePocketCount={activePocketCount}
            dataSourceStatus={dataSourceStatus}
            environment={databaseEnvironment}
            firebaseStatusMessage={firebaseStatusMessage}
            onLoadPocketMembers={loadAdminPocketMembers}
            onLoadUsers={async options => {
              const result = await loadAdminUsers(databaseEnvironment, options);
              setUsers(result.users);
              setUserTotalCount(result.totalCount);
              return result;
            }}
            pendingDeletionPocketCount={pendingDeletionPocketCount}
            pockets={pockets}
            pocketWeeklyDelta={dashboardMetrics.pocketWeeklyDelta}
            reportCountByUserId={reportCountByUserId}
            reports={contentReports}
            onSetUserSuspension={async (userId, options) => {
              await setAdminUserSuspension(userId, options, databaseEnvironment);
              setUsers(current => current.map(user => user.id === userId ? {
                ...user,
                status: options.lift ? 'active' : 'suspended',
                suspensionPermanent: options.permanent === true,
                suspendedUntil: options.lift || options.permanent ? null : new Date(Date.now() + (options.durationDays ?? 0) * 86_400_000).toISOString(),
              } : user));
            }}
            userWeeklyDelta={dashboardMetrics.userWeeklyDelta}
            users={users}
            userTotalCount={userTotalCount}
            registeredUserCount={registeredUserCount}
          />
        ) : null}

        {page === 'database' ? (
          <DatabaseStatusPage
            databaseBackupStatus={databaseBackupStatus}
            dataSourceStatus={databaseDataSourceStatus}
            environment={databaseEnvironment}
            firebaseStatusMessage={databaseStatusMessage}
            onEnvironmentChange={handleDatabaseEnvironmentChange}
          />
        ) : null}

        {page === 'versions' ? (
          <VersionNotesPage
            environment={databaseEnvironment}
            notes={versionNotes}
            onChangeNotes={setVersionNotes}
            onDeleteNote={(note) => deleteAdminVersionNote(note.id, databaseEnvironment)}
            onSaveNote={(note) => saveAdminVersionNote(note, databaseEnvironment)}
            onSelectNote={setSelectedVersionId}
            selectedNote={selectedVersion}
          />
        ) : null}

        {page === 'updates' ? (
          <AppNoticeManagement environment={databaseEnvironment} />
        ) : null}

        {page === 'support' ? (
          <SupportPage
            inquiries={supportInquiries}
            onAnswerInquiry={async (inquiry, answer) => {
              await answerSupportInquiryRemote(inquiry, answer, databaseEnvironment);
              const refreshedInquiries = await loadAdminSupportInquiries(databaseEnvironment);
              setSupportInquiries(refreshedInquiries);
            }}
            waitingCount={waitingInquiryCount}
          />
        ) : null}
        {page === 'moderation' ? (
          <ModerationPage reports={contentReports} onResolve={async (reportId, action, note) => {
            await resolveAdminContentReport(reportId, action, note, databaseEnvironment);
            setContentReports(await loadAdminContentReports(databaseEnvironment));
            setPockets(await loadAdminPockets(databaseEnvironment));
          }} />
        ) : null}
      </main>
      {isLogoutDialogOpen ? (
        <div className="logoutConfirmBackdrop" role="presentation">
          <section
            aria-labelledby="logout-confirm-title"
            aria-modal="true"
            className="logoutConfirmDialog"
            role="dialog"
          >
            <h2 id="logout-confirm-title">로그아웃할까요?</h2>
            <p>로그아웃하면 다시 로그인해야 해요.</p>
            <div className="logoutConfirmActions">
              <button type="button" onClick={() => setIsLogoutDialogOpen(false)}>
                취소
              </button>
              <button type="button" onClick={logoutAdmin}>
                로그아웃
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type DashboardPageProps = {
  activePocketCount: number;
  dataSourceStatus: DataSourceStatus;
  environment: DatabaseEnvironment;
  firebaseStatusMessage: string;
  onLoadPocketMembers: (
    pocketId: string,
    environment: DatabaseEnvironment,
  ) => Promise<AdminPocketMember[]>;
  onLoadUsers: (options: { page: number; pageSize: number; query: string; status: 'active' | 'all' | 'suspended' }) => Promise<AdminUserPage>;
  pendingDeletionPocketCount: number;
  pockets: AdminPocket[];
  pocketWeeklyDelta: number;
  reportCountByUserId: Record<string, number>;
  reports: ContentReport[];
  onSetUserSuspension: (userId: string, options: { durationDays?: number; lift?: boolean; permanent?: boolean }) => Promise<void>;
  userWeeklyDelta: number;
  users: AdminUser[];
  userTotalCount: number;
  registeredUserCount: number;
};

function ModerationPage({ reports, onResolve }: { reports: ContentReport[]; onResolve: (id: string, action: ModerationAction, note: string) => Promise<void> }) {
  const [selected, setSelected] = useState<ContentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [error, setError] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const reasonLabels: Record<string, string> = {
    abuse: '괴롭힘 또는 욕설',
    harassment: '괴롭힘 또는 욕설',
    hate: '혐오 표현',
    inappropriate: '부적절한 콘텐츠',
    other: '기타',
    sexual: '성적인 콘텐츠',
    spam: '스팸 또는 광고',
    violence: '폭력 또는 위협',
  };
  const typeLabels = { chatMessage: '채팅', feed: '피드', user: '사용자' };
  const reportPageCount = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const visibleReports = paginate(reports, reportPage);

  useEffect(() => {
    setReportPage((currentPage) => Math.min(currentPage, reportPageCount));
  }, [reportPageCount]);

  async function act(action: ModerationAction) {
    if (!selected) return;
    setBusy(true); setPendingAction(action); setError('');
    try { await onResolve(selected.id, action, ''); setSelected(null); }
    catch { setError('처리하지 못했어요. 신고 상태와 관리자 권한을 확인해 주세요.'); }
    finally { setBusy(false); setPendingAction(null); }
  }
  return <section className="moderationLayout">
    <article className="panel moderationList">
      <div className="panelHeader"><div><p className="eyebrow">신고</p><h2>접수된 신고</h2></div><span className="moderationCount">미처리 {reports.filter(r => r.status === 'open').length}건</span></div>
      <div className="tableWrap"><table><thead><tr><th>상태</th><th>유형</th><th>신고 대상</th><th>주머니</th><th>사유</th><th>접수 시각</th></tr></thead><tbody>
        {visibleReports.map(report => <tr className="moderationRow" key={report.id} onClick={() => { setSelected(report); setError(''); }}>
          <td><span className={`reportStatus ${report.status}`}>{report.status === 'open' ? '미처리' : report.status === 'dismissed' ? '문제 없음' : '처리 완료'}</span></td><td>{typeLabels[report.targetType]}</td><td><strong>{report.targetName}</strong></td><td>{report.pocketName}</td><td>{reasonLabels[report.reason] ?? report.reason}</td><td>{report.createdAt ? new Date(report.createdAt).toLocaleString('ko-KR') : '-'}</td>
        </tr>)}
        {!reports.length ? <tr><td className="emptyTableCell" colSpan={6}>접수된 신고가 없습니다.</td></tr> : null}
      </tbody></table></div>
      <Pagination
        currentPage={reportPage}
        onChange={setReportPage}
        pageCount={reportPageCount}
        totalCount={reports.length}
      />
    </article>
    {selected ? <div className="pocketMembersBackdrop" role="presentation"><section className="pocketMembersDialog moderationDialog" role="dialog" aria-modal="true">
      <div className="panelHeader"><div><p className="eyebrow">신고 상세</p><h2>신고 내용 확인</h2></div><button className="pocketMembersClose" onClick={() => setSelected(null)} type="button">닫기</button></div>
      <div className="moderationDetail"><dl><div><dt>신고자</dt><dd>{selected.reporterName}</dd></div><div><dt>신고 대상</dt><dd>{selected.targetName}</dd></div><div><dt>주머니</dt><dd>{selected.pocketName}</dd></div><div><dt>사유</dt><dd>{reasonLabels[selected.reason] ?? selected.reason}</dd></div></dl>
      {selected.details ? <div className="evidenceBox"><strong>추가 설명</strong><p>{selected.details}</p></div> : null}
      <div className="evidenceBox"><strong>신고 당시 콘텐츠</strong><EvidenceSummary createdAt={selected.createdAt} evidence={selected.evidence} /></div>
      {selected.status === 'open' ? <>{error ? <p className="moderationError">{error}</p> : null}<div className="moderationActions"><button aria-busy={pendingAction === 'dismiss'} disabled={busy} onClick={() => act('dismiss')} type="button">{pendingAction === 'dismiss' ? <><LoaderCircle aria-hidden="true" className="buttonSpinner" size={16} /><span className="srOnly">문제 없음 처리 중</span></> : '문제 없음'}</button><button aria-busy={pendingAction === 'confirm_violation'} className="danger" disabled={busy} onClick={() => act('confirm_violation')} type="button">{pendingAction === 'confirm_violation' ? <><LoaderCircle aria-hidden="true" className="buttonSpinner" size={16} /><span className="srOnly">위반 처리 중</span></> : '위반 처리'}</button></div></> : <p className="moderationResolved">이미 처리된 신고입니다.</p>}
      </div>
    </section></div> : null}
  </section>;
}

function DashboardPage({
  activePocketCount,
  dataSourceStatus,
  environment,
  firebaseStatusMessage,
  onLoadPocketMembers,
  onLoadUsers,
  pendingDeletionPocketCount,
  pockets,
  pocketWeeklyDelta,
  reportCountByUserId,
  reports,
  onSetUserSuspension,
  userWeeklyDelta,
  users,
  userTotalCount,
  registeredUserCount,
}: DashboardPageProps) {
  const [userQuery, setUserQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'active' | 'all' | 'suspended'>('all');
  const [userPage, setUserPage] = useState(1);
  const [pocketQuery, setPocketQuery] = useState('');
  const [pocketStatusFilter, setPocketStatusFilter] =
    useState<'active' | 'all' | 'pendingDeletion'>('all');
  const [pocketPage, setPocketPage] = useState(1);
  const [selectedPocket, setSelectedPocket] = useState<AdminPocket | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspensionDays, setSuspensionDays] = useState('');
  const [suspensionPreset, setSuspensionPreset] = useState<3 | 7 | 30 | 'permanent' | null>(null);
  const [suspensionBusy, setSuspensionBusy] = useState(false);
  const [suspensionError, setSuspensionError] = useState('');
  const [pendingSuspension, setPendingSuspension] = useState<{ durationDays?: number; permanent?: boolean } | null>(null);
  const [pocketMembers, setPocketMembers] = useState<AdminPocketMember[]>([]);
  const [isLoadingPocketMembers, setIsLoadingPocketMembers] = useState(false);
  const [pocketMembersError, setPocketMembersError] = useState('');

  const sortedPockets = useMemo(() => {
    const normalizedQuery = pocketQuery.trim().toLocaleLowerCase('ko-KR');
    const filteredPockets = pockets.filter((pocketItem) => {
      const matchesQuery =
        !normalizedQuery ||
        pocketItem.name.toLocaleLowerCase('ko-KR').includes(normalizedQuery);
      const matchesStatus =
        pocketStatusFilter === 'all' || pocketItem.status === pocketStatusFilter;
      return matchesQuery && matchesStatus;
    });

    return [...filteredPockets].sort(
      (left, right) =>
        right.memberCount - left.memberCount ||
        right.recordCount - left.recordCount,
    );
  }, [pocketQuery, pocketStatusFilter, pockets]);

  const userPageCount = Math.max(1, Math.ceil(userTotalCount / PAGE_SIZE));
  const pocketPageCount = Math.max(1, Math.ceil(sortedPockets.length / PAGE_SIZE));
  const visibleUsers = users;
  const visiblePockets = paginate(sortedPockets, pocketPage);
  const selectedUserReports = selectedUser
    ? reports.filter(report => report.status === 'resolved' && [report.targetUid, report.targetId, report.evidence.authorUid].includes(selectedUser.id))
    : [];

  async function updateSuspension(options: { durationDays?: number; lift?: boolean; permanent?: boolean }) {
    if (!selectedUser) return;
    setSuspensionBusy(true);
    setSuspensionError('');
    try {
      await onSetUserSuspension(selectedUser.id, options);
      setSelectedUser(current => current ? {
        ...current,
        status: options.lift ? 'active' : 'suspended',
        suspensionPermanent: options.permanent === true,
        suspendedUntil: options.lift || options.permanent ? null : new Date(Date.now() + (options.durationDays ?? 0) * 86_400_000).toISOString(),
      } : null);
      setSuspensionDays('');
      setSuspensionPreset(null);
    } catch {
      setSuspensionError('사용자 정지 상태를 변경하지 못했어요.');
    } finally {
      setSuspensionBusy(false);
    }
  }

  function updateUserQuery(value: string) {
    setUserQuery(value);
    setUserPage(1);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void onLoadUsers({ page: userPage, pageSize: PAGE_SIZE, query: userQuery.trim(), status: userStatusFilter });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [userPage, userQuery, userStatusFilter]);

  function updatePocketQuery(value: string) {
    setPocketQuery(value);
    setPocketPage(1);
  }

  async function openPocketMembers(pocket: AdminPocket) {
    setSelectedPocket(pocket);
    setPocketMembers([]);
    setPocketMembersError('');
    setIsLoadingPocketMembers(true);

    try {
      setPocketMembers(await onLoadPocketMembers(pocket.id, environment));
    } catch {
      setPocketMembersError('참여자 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingPocketMembers(false);
    }
  }

  return (
    <>
      <section className="statsGrid dashboardStats" aria-label="핵심 지표">
        <StatCard
          icon={<Users size={20} aria-hidden="true" />}
          label="전체 사용자"
          value={`${registeredUserCount.toLocaleString()}명`}
          caption="가입된 전체 사용자 합계"
          trend={formatWeeklyTrend(userWeeklyDelta)}
        />
        <StatCard
          icon={<Layers3 size={20} aria-hidden="true" />}
          label="전체 주머니"
          value={`${activePocketCount.toLocaleString()}개`}
          caption={`운영 중인 주머니 · 삭제 대기 ${pendingDeletionPocketCount}개 제외`}
          trend={formatWeeklyTrend(pocketWeeklyDelta)}
        />
      </section>

      <section className="dashboardSplit">
        <article className="panel tallPanel" id="users">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">사용자</p>
              <h2>전체 사용자 목록</h2>
            </div>
            <div className="userListControls">
              <AdminSearch value={userQuery} onChange={updateUserQuery} placeholder="이름 또는 이메일 검색" />
              <div className="userStatusFilters" aria-label="사용자 상태 필터">
                {([['all', '전체'], ['active', '활성'], ['suspended', '정지']] as const).map(([value, label]) => <button className={userStatusFilter === value ? 'active' : ''} key={value} onClick={() => { setUserStatusFilter(value); setUserPage(1); }} type="button">{label}</button>)}
              </div>
            </div>
          </div>

          <div className="tableWrap compactTable dashboardTableWrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>사용자</th>
                  <th>로그인</th>
                  <th>참여</th>
                  <th>가입일</th>
                  <th>최근 로그인</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr className="userDetailRow" key={user.id} onClick={() => { setSelectedUser(user); setSuspensionError(''); setSuspensionDays(''); setSuspensionPreset(null); }}>
                    <td><UserStatusBadge status={user.status} /></td>
                    <td>
                      <div className="userCell">
                        <UserAvatar
                          displayName={user.displayName}
                          photoURL={user.photoURL}
                        />
                        <div>
                          <strong>{user.displayName}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <ProviderBadge provider={user.provider} />
                    </td>
                    <td>{user.pocketCount}개</td>
                    <td>{user.joinedAt}</td>
                    <td>{user.lastLoginAt}</td>
                  </tr>
                ))}
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td className="emptyTableCell" colSpan={6}>
                      데이터 없음
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={userPage}
            onChange={setUserPage}
            pageCount={userPageCount}
            totalCount={userTotalCount}
          />
        </article>

        <article className="panel tallPanel" id="pockets">
          <div className="panelHeader pocketPanelHeader">
            <div>
              <p className="eyebrow">주머니</p>
              <h2>주머니 현황</h2>
            </div>
            <div className="pocketListControls">
              <div className="userListControls">
                <AdminSearch
                  value={pocketQuery}
                  onChange={updatePocketQuery}
                  placeholder="주머니 이름 검색"
                />
                <div className="userStatusFilters" aria-label="주머니 상태 필터">
                  {([['all', '전체'], ['active', '운영'], ['pendingDeletion', '삭제 대기']] as const).map(
                    ([value, label]) => (
                      <button
                        className={pocketStatusFilter === value ? 'active' : ''}
                        key={value}
                        onClick={() => {
                          setPocketStatusFilter(value);
                          setPocketPage(1);
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="tableWrap compactTable dashboardTableWrap">
            <table>
              <thead>
                <tr>
                  <th>주머니</th>
                  <th>구성원</th>
                  <th>기록</th>
                  <th>레벨</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {visiblePockets.map((pocketItem) => (
                  <tr
                    aria-label={`${pocketItem.name} 참여자 보기`}
                    className="pocketMemberRow"
                    key={pocketItem.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPocketMembers(pocketItem)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openPocketMembers(pocketItem);
                      }
                    }}
                  >
                    <td>
                      <strong>{pocketItem.name}</strong>
                    </td>
                    <td>{pocketItem.memberCount}명</td>
                    <td>{pocketItem.recordCount}개</td>
                    <td>
                      <span className="levelChip">Lv.{pocketItem.level}</span>
                    </td>
                    <td>
                      <StatusBadge status={pocketItem.status} />
                    </td>
                  </tr>
                ))}
                {visiblePockets.length === 0 ? (
                  <tr>
                    <td className="emptyTableCell" colSpan={5}>
                      데이터 없음
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pocketPage}
            onChange={setPocketPage}
            pageCount={pocketPageCount}
            totalCount={sortedPockets.length}
          />
        </article>
      </section>

      {selectedUser ? (
        <div className="pocketMembersBackdrop" role="presentation">
          <section aria-labelledby="user-detail-title" aria-modal="true" className="pocketMembersDialog userDetailDialog" role="dialog">
            <div className="panelHeader compact">
              <div><p className="eyebrow">사용자 상세</p><h2 id="user-detail-title">{selectedUser.displayName}</h2></div>
              <button className="pocketMembersClose" onClick={() => setSelectedUser(null)} type="button">닫기</button>
            </div>
            <div className="userDetailContent">
              <div className="userDetailSummary">
                <UserAvatar displayName={selectedUser.displayName} photoURL={selectedUser.photoURL} />
                <div><strong>{selectedUser.displayName}</strong></div>
                <UserStatusBadge status={selectedUser.status} />
              </div>
              <section className="userReportSection">
                <div className="userDetailSectionTitle"><h3>처리 신고</h3><ReportCountBadge count={selectedUserReports.length} /></div>
                {selectedUserReports.length ? <div className="userReportList">{selectedUserReports.map(report => (
                  <div key={report.id}><strong>{report.targetType === 'feed' ? '피드' : report.targetType === 'chatMessage' ? '채팅' : '사용자'} · {REPORT_REASON_LABELS[report.reason] ?? report.reason}</strong><span>{report.resolvedAt ? new Date(report.resolvedAt).toLocaleString('ko-KR') : '-'}</span></div>
                ))}</div> : <p className="userDetailEmpty">처리 완료된 신고가 없습니다.</p>}
              </section>
              <section className="userSuspensionSection">
                <div className="userDetailSectionTitle"><h3>계정 정지</h3></div>
                {selectedUser.status === 'suspended' ? <p className="suspensionCurrent">{selectedUser.suspensionPermanent ? '영구 정지 중' : `${selectedUser.suspendedUntil ? new Date(selectedUser.suspendedUntil).toLocaleString('ko-KR') : '-'}까지 정지`}</p> : <p className="suspensionHelp">기간을 선택하거나 직접 일수를 입력해 주세요.</p>}
                <div className="suspensionPresets">{([3, 7, 30] as const).map(days => <button className={suspensionPreset === days ? 'selected' : ''} disabled={suspensionBusy} key={days} onClick={() => { setSuspensionPreset(days); setSuspensionDays(''); }} type="button">{days}일</button>)}<button className={`danger ${suspensionPreset === 'permanent' ? 'selected' : ''}`} disabled={suspensionBusy} onClick={() => { setSuspensionPreset('permanent'); setSuspensionDays(''); }} type="button">영구</button></div>
                <div className="suspensionCustom"><label htmlFor="suspension-days">직접 입력</label><div><input id="suspension-days" inputMode="numeric" min="1" max="3650" onChange={event => { setSuspensionDays(event.target.value.replace(/\D/g, '')); setSuspensionPreset(null); }} placeholder="일수" type="text" value={suspensionDays} /><button disabled={suspensionBusy || (!suspensionPreset && (!suspensionDays || Number(suspensionDays) < 1 || Number(suspensionDays) > 3650))} onClick={() => setPendingSuspension(suspensionPreset === 'permanent' ? { permanent: true } : { durationDays: typeof suspensionPreset === 'number' ? suspensionPreset : Number(suspensionDays) })} type="button">정지 적용</button></div></div>
                {suspensionError ? <p className="moderationError">{suspensionError}</p> : null}
                {selectedUser.status === 'suspended' ? <button className="suspensionLift" disabled={suspensionBusy} onClick={() => updateSuspension({ lift: true })} type="button">정지 해제</button> : null}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {selectedUser && pendingSuspension ? <div className="logoutConfirmBackdrop" role="presentation"><section aria-labelledby="suspension-confirm-title" aria-modal="true" className="logoutConfirmDialog suspensionConfirmDialog" role="dialog"><h2 id="suspension-confirm-title">계정을 정지할까요?</h2><p><strong>{selectedUser.displayName}</strong> 사용자를 {pendingSuspension.permanent ? '영구 정지' : `${pendingSuspension.durationDays}일 동안 정지`}합니다.</p><div className="logoutConfirmActions"><button onClick={() => setPendingSuspension(null)} type="button">취소</button><button className="dangerConfirm" disabled={suspensionBusy} onClick={() => { const options = pendingSuspension; setPendingSuspension(null); void updateSuspension(options); }} type="button">정지 적용</button></div></section></div> : null}

      {selectedPocket ? (
        <div className="pocketMembersBackdrop" role="presentation">
          <section
            aria-labelledby="pocket-members-title"
            aria-modal="true"
            className="pocketMembersDialog"
            role="dialog"
          >
            <div className="panelHeader compact">
              <div>
                <p className="eyebrow">참여자</p>
                <h2 id="pocket-members-title">{selectedPocket.name} 참여자</h2>
              </div>
              <button
                className="pocketMembersClose"
                type="button"
                onClick={() => setSelectedPocket(null)}
              >
                닫기
              </button>
            </div>
            <div className="pocketMembersContent">
              {isLoadingPocketMembers ? (
                <div className="pocketMembersLoading">
                  <div className="sessionLoader" aria-label="참여자 목록 불러오는 중" />
                </div>
              ) : null}
              {pocketMembersError ? <p className="pocketMembersError">{pocketMembersError}</p> : null}
              {!isLoadingPocketMembers && !pocketMembersError ? (
                <div className="pocketMembersList">
                  {pocketMembers.map((member) => (
                    <div className="pocketMemberItem" key={member.id}>
                      <UserAvatar
                        displayName={member.displayName}
                        photoURL={member.photoURL}
                      />
                      <div>
                        <strong>{member.displayName}</strong>
                      </div>
                      <small>{member.joinedAt} 참여</small>
                    </div>
                  ))}
                  {pocketMembers.length === 0 ? <p>참여자가 없어요.</p> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

type DatabaseStatusPageProps = {
  databaseBackupStatus: DatabaseBackupStatus | null;
  dataSourceStatus: DataSourceStatus;
  environment: DatabaseEnvironment;
  firebaseStatusMessage: string;
  onEnvironmentChange: (environment: DatabaseEnvironment) => void;
};

function DatabaseStatusPage({
  databaseBackupStatus,
  dataSourceStatus,
  environment,
  firebaseStatusMessage,
  onEnvironmentChange,
}: DatabaseStatusPageProps) {
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreBackup, setRestoreBackup] = useState<DatabaseBackup | null>(null);
  const [restoreDatabaseId, setRestoreDatabaseId] = useState('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreSecondConfirm, setRestoreSecondConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEnvironmentMenuOpen, setIsEnvironmentMenuOpen] = useState(false);

  const environmentLabel = environment === 'production' ? '운영' : '개발';

  function selectEnvironment(nextEnvironment: DatabaseEnvironment) {
    setIsEnvironmentMenuOpen(false);
    onEnvironmentChange(nextEnvironment);
  }

  function openRestoreDialog(backup: DatabaseBackup) {
    setRestoreBackup(backup);
    setRestoreDatabaseId(createRestoreDatabaseId(backup.snapshotTime));
    setRestoreConfirmText('');
    setRestoreSecondConfirm(false);
    setRestoreError('');
    setRestoreMessage('');
  }

  function closeRestoreDialog() {
    if (isRestoring) {
      return;
    }

    setRestoreBackup(null);
    setRestoreConfirmText('');
    setRestoreSecondConfirm(false);
    setRestoreError('');
  }

  async function submitRestore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restoreBackup) {
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError('');
      const operation = await startAdminDatabaseRestore(
        restoreBackup,
        restoreDatabaseId.trim(),
        restoreConfirmText.trim(),
        restoreSecondConfirm,
        environment,
      );
      setRestoreMessage(
        `${operation.databaseId} 새 DB 복원 작업을 시작했어요. 작업 ID: ${operation.operationName}`,
      );
      setRestoreBackup(null);
      setRestoreConfirmText('');
      setRestoreSecondConfirm(false);
    } catch {
      setRestoreError('복원 작업을 시작하지 못했어요. DB 이름과 확인 문구를 다시 확인해 주세요.');
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section className="databasePageLayout">
      <article className="panel databaseStatusPanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Database</p>
            <h2>{environmentLabel} DB 현황</h2>
          </div>
          <div className="databaseHeaderActions">
            <div className="databaseEnvironmentSelect">
              <button
                aria-controls="database-environment-menu"
                aria-expanded={isEnvironmentMenuOpen}
                className="databaseEnvironmentTrigger"
                type="button"
                onClick={() => setIsEnvironmentMenuOpen((isOpen) => !isOpen)}
              >
                <span>{environmentLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={isEnvironmentMenuOpen ? 'open' : ''}
                  size={16}
                />
              </button>
              {isEnvironmentMenuOpen ? (
                <div
                  aria-label="DB 환경 선택"
                  className="databaseEnvironmentMenu"
                  id="database-environment-menu"
                  role="menu"
                >
                  {(['production', 'development'] as const).map((option) => {
                    const label = option === 'production' ? '운영' : '개발';
                    const isSelected = option === environment;

                    return (
                      <button
                        aria-checked={isSelected}
                        className={isSelected ? 'selected' : ''}
                        key={option}
                        role="menuitemradio"
                        type="button"
                        onClick={() => selectEnvironment(option)}
                      >
                        <span>{label}</span>
                        {isSelected ? <Check aria-hidden="true" size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <span className={`dataSourcePill ${dataSourceStatus}`}>
              <i aria-hidden="true" />
              {firebaseStatusMessage}
            </span>
          </div>
        </div>

        {databaseBackupStatus ? (
          <>
            <div className="databaseStatusGrid">
              <div>
                <span>프로젝트</span>
                <strong>{databaseBackupStatus.projectId}</strong>
              </div>
              <div>
                <span>데이터베이스</span>
                <strong>{databaseBackupStatus.databaseId}</strong>
              </div>
              <div>
                <span>위치</span>
                <strong>{databaseBackupStatus.locationId}</strong>
              </div>
              <div>
                <span>PITR</span>
                <strong>{databaseBackupStatus.pointInTimeRecoveryEnablement}</strong>
              </div>
              <div>
                <span>가장 이른 복구 시각</span>
                <strong>{databaseBackupStatus.earliestVersionTime}</strong>
              </div>
              <div>
                <span>삭제 보호</span>
                <strong>{databaseBackupStatus.deleteProtectionState}</strong>
              </div>
            </div>

            <div className="databaseRestoreNotice">
              <strong>복원 기능</strong>
              <p>
                그때로 돌아가는 건 가능하지만, 안전한 방식은 먼저 새 DB로
                복원하고 확인한 뒤 {environmentLabel} 환경에서 검증하는 것입니다.
              </p>
              <small>
                백업 복원은 {environmentLabel} DB를 바로 덮어쓰지 않고 선택한 백업 시점의
                새 Firestore DB를 생성합니다. PITR 날짜 복원은 가장 이른 복구
                시각 이후의 분 단위 시각으로 새 DB clone/export 방식이 가능합니다.
              </small>
              <small>{databaseBackupStatus.restoreSummary}</small>
              {restoreMessage ? <em>{restoreMessage}</em> : null}
            </div>

            <div className="databaseTwoColumn">
              <section>
                <div className="panelHeader compact inlinePanelHeader">
                  <div>
                    <p className="eyebrow">Schedules</p>
                    <h3>백업 스케줄</h3>
                  </div>
                </div>
                <div className="databaseList">
                  {databaseBackupStatus.backupSchedules.map((schedule) => (
                    <div key={schedule.id}>
                      <strong>{schedule.recurrence}</strong>
                      <span>{schedule.retention}</span>
                    </div>
                  ))}
                  {databaseBackupStatus.backupSchedules.length === 0 ? (
                    <div>
                      <strong>스케줄 없음</strong>
                      <span>Firestore Admin API에서 조회된 백업 스케줄이 없어요.</span>
                    </div>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="panelHeader compact inlinePanelHeader">
                  <div>
                    <p className="eyebrow">Backups</p>
                    <h3>최근 백업</h3>
                  </div>
                </div>
                <div className="databaseList">
                  {databaseBackupStatus.backups.map((backup) => (
                    <div className="databaseBackupItem" key={backup.id}>
                      <div>
                        <strong>{backup.snapshotTime}</strong>
                        <span>{backup.state} · 만료 {backup.expireTime}</span>
                      </div>
                      <button
                        disabled={backup.state !== 'READY'}
                        type="button"
                        onClick={() => openRestoreDialog(backup)}
                      >
                        복원
                      </button>
                    </div>
                  ))}
                  {databaseBackupStatus.backups.length === 0 ? (
                    <div>
                      <strong>백업 없음</strong>
                      <span>현재 조회 가능한 Firestore 백업이 없어요.</span>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="databaseLoadingState">
            {environmentLabel} Firebase DB 현황을 불러오는 중이에요.
          </div>
        )}
      </article>
      {restoreBackup ? (
        <div className="restoreDialogBackdrop" role="presentation">
          <form className="restoreDialog" onSubmit={submitRestore}>
            <div className="panelHeader compact">
              <div>
                <p className="eyebrow">Restore</p>
                <h2>새 DB로 복원</h2>
              </div>
            </div>

            <div className="restoreImpactNotice">
              <strong>{restoreBackup.snapshotTime} 백업 기준</strong>
              <p>
                이 작업은 {environmentLabel} DB를 즉시 되돌리지 않습니다. 선택한 백업 시점의
                데이터로 새 Firestore DB를 만들고, 복원된 DB를 확인한 뒤 운영
                전환이나 데이터 이관을 따로 결정해야 합니다.
              </p>
              <p>
                새 DB 생성에는 시간이 걸릴 수 있고, 이미 존재하는 DB 이름은
                사용할 수 없습니다.
              </p>
            </div>

            <label>
              새 DB 이름 입력
              <input
                placeholder="예: mypot-restore-20260721-0221"
                value={restoreDatabaseId}
                onChange={(event) => setRestoreDatabaseId(event.target.value)}
              />
            </label>

            <label>
              문구 입력
              <input
                placeholder="정말 복원합니다"
                value={restoreConfirmText}
                onChange={(event) => setRestoreConfirmText(event.target.value)}
              />
            </label>

            <label className="restoreCheckRow">
              <input
                checked={restoreSecondConfirm}
                type="checkbox"
                onChange={(event) =>
                  setRestoreSecondConfirm(event.target.checked)
                }
              />
              2단계 확인: 새 DB로 복원 후 검증하고 운영 전환은 별도로 진행합니다.
            </label>

            {restoreError ? <p className="restoreError">{restoreError}</p> : null}

            <div className="restoreDialogActions">
              <button type="button" onClick={closeRestoreDialog}>
                취소
              </button>
              <button
                disabled={
                  isRestoring ||
                  restoreConfirmText.trim() !== '정말 복원합니다' ||
                  !restoreSecondConfirm ||
                  !restoreDatabaseId.trim()
                }
                type="submit"
              >
                {isRestoring ? '복원 요청 중' : '새 DB 만들기'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

type PaginationProps = {
  currentPage: number;
  onChange: (page: number) => void;
  pageCount: number;
  totalCount: number;
};

function Pagination({
  currentPage,
  onChange,
  pageCount,
  totalCount,
}: PaginationProps) {
  if (totalCount <= PAGE_SIZE) {
    return <div className="pagination paginationHidden" />;
  }

  return (
    <div className="pagination">
      <span>
        {currentPage} / {pageCount}
      </span>
      <div>
        <button
          disabled={currentPage <= 1}
          type="button"
          onClick={() => onChange(currentPage - 1)}
        >
          이전
        </button>
        <button
          disabled={currentPage >= pageCount}
          type="button"
          onClick={() => onChange(currentPage + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}

const releaseTypeLabel: Record<VersionReleaseType, string> = {
  major: '메이저',
  minor: '마이너',
  patch: '패치',
};

type VersionNotesPageProps = {
  environment: DatabaseEnvironment;
  notes: VersionNote[];
  onChangeNotes: (notes: VersionNote[]) => void;
  onDeleteNote: (note: VersionNote) => Promise<void> | void;
  onSaveNote: (note: VersionNote) => Promise<void> | void;
  onSelectNote: (id: string) => void;
  selectedNote: VersionNote | null;
};

function VersionNotesPage({
  environment,
  notes,
  onChangeNotes,
  onDeleteNote,
  onSaveNote,
  onSelectNote,
  selectedNote,
}: VersionNotesPageProps) {
  const [saveMessage, setSaveMessage] = useState('');
  const [savedVersionNote, setSavedVersionNote] = useState<VersionNote | null>(null);
  const [notePendingDeletion, setNotePendingDeletion] = useState<VersionNote | null>(null);
  const [isDeletingVersionNote, setIsDeletingVersionNote] = useState(false);
  const [isSavingVersionNote, setIsSavingVersionNote] = useState(false);
  const environmentLabel = environment === 'production' ? '운영' : '개발';

  function updateSelectedNote(nextNote: VersionNote) {
    if (!selectedNote) {
      return;
    }

    setSaveMessage('');
    onChangeNotes(
      notes.map((note) => (note.id === selectedNote.id ? nextNote : note)),
    );
  }

  function createVersionNote() {
    const existingDraft = notes.find((note) => note.status === 'draft');
    if (existingDraft) {
      setSaveMessage(`${existingDraft.version} 버전을 작성 중이에요.`);
      onSelectNote(existingDraft.id);
      return;
    }

    const version = getNextPatchVersion(notes);
    const newNote = createVersionNoteDraft(version, notes.length === 0);

    setSaveMessage(`${version} 새 노트 생성`);
    onChangeNotes([newNote, ...notes]);
    onSelectNote(newNote.id);
  }

  async function saveVersionNote() {
    if (!selectedNote || isSavingVersionNote) {
      return;
    }

    const releaseType = detectReleaseType(selectedNote.version, notes, selectedNote.id);
    const noteToSave = {
      ...selectedNote,
      releaseType,
      status: 'published' as const,
    };

    try {
      setIsSavingVersionNote(true);
      await onSaveNote(noteToSave);
      const publishedNotes = notes
        .map((note) => (note.id === selectedNote.id ? noteToSave : note))
        .sort(compareVersionNotes);
      const nextVersion = getNextPatchVersion(publishedNotes);
      const nextDraft = createVersionNoteDraft(nextVersion, false);
      onChangeNotes([nextDraft, ...publishedNotes]);
      onSelectNote(nextDraft.id);
      setSaveMessage(`${selectedNote.version} 작성 완료 · ${nextVersion} 작성 중`);
      setSavedVersionNote(noteToSave);
    } catch {
      setSaveMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSavingVersionNote(false);
    }
  }

  function requestVersionNoteDeletion() {
    if (!selectedNote || isDeletingVersionNote || isSavingVersionNote) {
      return;
    }

    setNotePendingDeletion(selectedNote);
  }

  async function deleteVersionNote() {
    if (!notePendingDeletion || isDeletingVersionNote || isSavingVersionNote) {
      return;
    }

    try {
      setIsDeletingVersionNote(true);
      await onDeleteNote(notePendingDeletion);
      const remainingNotes = notes.filter((note) => note.id !== notePendingDeletion.id);
      onChangeNotes(remainingNotes);
      onSelectNote(remainingNotes[0]?.id ?? '');
      setNotePendingDeletion(null);
      setSaveMessage('버전 노트를 삭제했어요.');
    } catch {
      setSaveMessage('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeletingVersionNote(false);
    }
  }

  function updatePatch(
    index: number,
    field: 'description' | 'title',
    value: string,
  ) {
    if (!selectedNote) {
      return;
    }

    updateSelectedNote({
      ...selectedNote,
      patches: selectedNote.patches.map((patch, patchIndex) =>
        patchIndex === index ? { ...patch, [field]: value } : patch,
      ),
    });
  }

  function addPatch() {
    if (!selectedNote) {
      return;
    }

    updateSelectedNote({
      ...selectedNote,
      patches: [
        ...selectedNote.patches,
        { description: '변경 내용을 입력해 주세요.', title: '새 패치 항목' },
      ],
    });
  }

  function removePatch(index: number) {
    if (!selectedNote) {
      return;
    }

    if (selectedNote.patches.length <= 1) {
      return;
    }

    updateSelectedNote({
      ...selectedNote,
      patches: selectedNote.patches.filter((_, patchIndex) => patchIndex !== index),
    });
  }

  return (
    <section className="versionEditorLayout">
      <aside className="panel versionHistoryPanel">
        <div className="panelHeader compact versionHistoryHeader">
          <div>
            <p className="eyebrow">History</p>
            <h2>{environmentLabel} 이전 버전 노트</h2>
          </div>
          <button type="button" onClick={createVersionNote}>
            새 노트 작성
          </button>
        </div>
        <div className="versionHistoryList simpleVersionList">
          <div className="releaseLegend">
            <span><i className="legendDot patch" />패치</span>
            <span><i className="legendDot minor" />마이너</span>
            <span><i className="legendDot major" />메이저</span>
          </div>
          {notes.map((note) => (
            <button
              className={
                note.id === selectedNote?.id
                  ? 'versionHistoryItem selected'
                  : 'versionHistoryItem'
              }
              key={note.id}
              type="button"
              onClick={() => onSelectNote(note.id)}
            >
              <div>
                <strong>{note.version}</strong>
                <span className="versionHistoryTags">
                  <span className={`releaseTypeTag ${note.releaseType}`}>
                    {releaseTypeLabel[note.releaseType]}
                  </span>
                  <span className={`versionStatusTag ${note.status}`}>
                    {note.status === 'draft' ? '작성 중' : '작성 완료'}
                  </span>
                </span>
              </div>
              <small>{note.releasedAt}</small>
            </button>
          ))}
          {notes.length === 0 ? (
            <div className="emptyHistoryState">데이터 없음</div>
          ) : null}
        </div>
      </aside>

      {selectedNote ? (
        <article className="panel versionEditPanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Edit</p>
            <h2>버전 노트 수정</h2>
          </div>
          <div className="versionHeaderActions">
            {saveMessage ? <span>{saveMessage}</span> : null}
            <button
              disabled={isSavingVersionNote || isDeletingVersionNote}
              type="button"
              onClick={saveVersionNote}
            >
              {isSavingVersionNote ? '작성 중' : '작성'}
            </button>
            <button
              className="versionDeleteButton"
              disabled={isSavingVersionNote || isDeletingVersionNote}
              type="button"
              onClick={requestVersionNoteDeletion}
            >
              {isDeletingVersionNote ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">삭제 중</span>
                  </>
                ) : (
                  '삭제'
                )}
            </button>
          </div>
        </div>

        <div className="versionForm">
          <label>
            버전
            <input
              value={selectedNote.version}
              onChange={(event) =>
                updateSelectedNote({ ...selectedNote, version: event.target.value })
              }
            />
          </label>
          <label>
            업데이트 날짜
            <input
              value={selectedNote.releasedAt}
              onChange={(event) =>
                updateSelectedNote({
                  ...selectedNote,
                  releasedAt: event.target.value,
                })
              }
            />
          </label>
          <div className="patchEditorHeader">
            <h3>앱 패치 항목</h3>
            <button type="button" onClick={addPatch}>
              항목 추가
            </button>
          </div>

          <div className="patchEditorList">
            {selectedNote.patches.map((patch, index) => (
              <div className="patchEditorItem" key={`${selectedNote.id}-${index}`}>
                <div className="patchEditorTop">
                  <strong>{index + 1}</strong>
                  <button type="button" onClick={() => removePatch(index)}>
                    삭제
                  </button>
                </div>
                <label>
                  제목
                  <input
                    value={patch.title}
                    onChange={(event) => updatePatch(index, 'title', event.target.value)}
                  />
                </label>
                <label>
                  설명
                  <textarea
                    value={patch.description}
                    onChange={(event) =>
                      updatePatch(index, 'description', event.target.value)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </article>
      ) : (
        <article className="panel versionEditPanel emptyState">데이터 없음</article>
      )}

      {selectedNote ? (
        <article className="panel appPatchPreviewPanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>앱 패치노트 미리보기</h2>
          </div>
          <div className="previewVersionMeta">
            <span className={`releaseTypeTag ${selectedNote.releaseType}`}>{releaseTypeLabel[selectedNote.releaseType]}</span>
            <span>버전 {selectedNote.version}</span>
          </div>
        </div>
        <div className="appPatchPreviewBody">
          <div className="versionPreviewPhone">
            <div className="versionPreviewSpeaker" />
            <div className="appVersionPatchCard standalonePatchCard">
              <div className="appNotebookBinding">
                {[0, 1, 2, 3].map((item) => (
                  <span key={item} />
                ))}
              </div>
              <div className="appNotebookBody">
                <div className="appPatchHeader">
                  <div>
                    <h3>이번 패치노트</h3>
                    <p>{selectedNote.releasedAt} 업데이트</p>
                  </div>
                  <span>{selectedNote.status === 'draft' ? '미리보기' : '최신'}</span>
                </div>
                <div className="appPatchDivider" />
                <div className="appPatchList">
                  {selectedNote.patches.map((patch, index) => (
                    <div className="appPatchRow" key={`${patch.title}-${index}`}>
                      <div className="appPatchIcon">✓</div>
                      <div>
                        <strong>{patch.title}</strong>
                        <p>{patch.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
      ) : (
        <article className="panel appPatchPreviewPanel emptyState">데이터 없음</article>
      )}
      {savedVersionNote ? (
        <div className="versionSaveBackdrop" role="presentation">
          <section
            aria-labelledby="version-save-title"
            aria-modal="true"
            className="versionSaveDialog"
            role="dialog"
          >
            <p className="eyebrow">Saved</p>
            <h2 id="version-save-title">버전 노트를 작성했어요</h2>
            <p>
              {savedVersionNote.version} · {releaseTypeLabel[savedVersionNote.releaseType]}
            </p>
            <button type="button" onClick={() => setSavedVersionNote(null)}>
              확인
            </button>
          </section>
        </div>
      ) : null}
      {notePendingDeletion ? (
        <div className="versionSaveBackdrop" role="presentation">
          <section
            aria-labelledby="version-delete-title"
            aria-modal="true"
            className="versionSaveDialog versionDeleteDialog"
            role="dialog"
          >
            <h2 id="version-delete-title">버전 노트를 삭제할까요?</h2>
            <p>{notePendingDeletion.version} 버전 노트가 삭제됩니다.</p>
            <div className="versionDeleteDialogActions">
              <button
                disabled={isDeletingVersionNote}
                type="button"
                onClick={() => setNotePendingDeletion(null)}
              >
                취소
              </button>
              <button
                disabled={isDeletingVersionNote}
                type="button"
                onClick={deleteVersionNote}
              >
                {isDeletingVersionNote ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">삭제 중</span>
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
type SupportPageProps = {
  inquiries: SupportInquiry[];
  onAnswerInquiry: (inquiry: SupportInquiry, answer: string) => Promise<void> | void;
  waitingCount: number;
};

function SupportPage({
  inquiries,
  onAnswerInquiry,
  waitingCount,
}: SupportPageProps) {
  const [inquiryFilter, setInquiryFilter] = useState<'waiting' | 'answered'>('waiting');
  const answeredCount = inquiries.filter((inquiry) => inquiry.status === 'answered').length;
  const filteredInquiries = inquiries.filter(
    (inquiry) => inquiry.status === inquiryFilter,
  );
  const defaultInquiryId =
    filteredInquiries[0]?.id ??
    '';
  const [selectedInquiryId, setSelectedInquiryId] = useState(defaultInquiryId);
  const selectedInquiry =
    filteredInquiries.find((inquiry) => inquiry.id === selectedInquiryId) ??
    filteredInquiries[0];
  const [answerText, setAnswerText] = useState(selectedInquiry?.answer ?? '');
  const [isAnswerConfirmOpen, setIsAnswerConfirmOpen] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  useEffect(() => {
    const selectedIsVisible = filteredInquiries.some(
      (inquiry) => inquiry.id === selectedInquiryId,
    );
    if (!selectedIsVisible) {
      setSelectedInquiryId(filteredInquiries[0]?.id ?? '');
    }
  }, [filteredInquiries, selectedInquiryId]);

  useEffect(() => {
    setAnswerText(selectedInquiry?.answer ?? '');
  }, [selectedInquiry?.answer, selectedInquiry?.id]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInquiry || !answerText.trim()) {
      return;
    }

    setIsAnswerConfirmOpen(true);
  }

  async function confirmAnswer() {
    if (!selectedInquiry || !answerText.trim() || isSubmittingAnswer) {
      return;
    }

    try {
      setIsSubmittingAnswer(true);
      await onAnswerInquiry(selectedInquiry, answerText.trim());
      setIsAnswerConfirmOpen(false);
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  return (
    <section className="supportDeskLayout">
      <aside className="panel supportQueuePanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">1:1 문의</p>
            <h2>문의 내역</h2>
          </div>
          <strong className="supportQueueCount">{inquiries.length}건</strong>
        </div>

        <div className="supportStatusTabs" role="tablist" aria-label="문의 상태">
          <button
            aria-selected={inquiryFilter === 'waiting'}
            className={inquiryFilter === 'waiting' ? 'active' : ''}
            onClick={() => setInquiryFilter('waiting')}
            role="tab"
            type="button"
          >
            답변 대기 <span>{waitingCount}</span>
          </button>
          <button
            aria-selected={inquiryFilter === 'answered'}
            className={inquiryFilter === 'answered' ? 'active' : ''}
            onClick={() => setInquiryFilter('answered')}
            role="tab"
            type="button"
          >
            처리 완료 <span>{answeredCount}</span>
          </button>
        </div>

        <div className="supportTicketList">
          {filteredInquiries.map((inquiry) => (
            <button
              className={
                inquiry.id === selectedInquiry?.id
                  ? 'supportTicketItem selected'
                  : 'supportTicketItem'
              }
              key={inquiry.id}
              type="button"
              onClick={() => setSelectedInquiryId(inquiry.id)}
            >
              <div>
                <StatusBadge status={inquiry.status} />
                <span>{inquiry.category}</span>
              </div>
              <strong>{inquiry.title}</strong>
              <small>
                {inquiry.userName} · {inquiry.createdAt}
              </small>
            </button>
          ))}
          {filteredInquiries.length === 0 ? (
            <div className="emptyTicketState">
              {inquiryFilter === 'waiting'
                ? '답변을 기다리는 문의가 없어요.'
                : '처리 완료된 문의가 없어요.'}
            </div>
          ) : null}
        </div>
      </aside>

      {selectedInquiry ? (
        <article className="panel supportDetailPanel">
          <div className="panelHeader supportDetailHeader">
            <div>
              <p className="eyebrow">Inquiry</p>
              <h2>{selectedInquiry.title}</h2>
              <span>
                {selectedInquiry.userName} · {selectedInquiry.userEmail} ·{' '}
                {selectedInquiry.createdAt}
              </span>
            </div>
            <StatusBadge status={selectedInquiry.status} />
          </div>

          <div className="supportDetailBody">
            <div className="customerMessageCard">
              <div className="messageHeader">
                <MessageCircle size={17} aria-hidden="true" />
                <strong>고객 문의 내용</strong>
              </div>
              <p>{selectedInquiry.body}</p>
            </div>

            <div className="attachmentSection">
              <div className="attachmentHeader">
                <strong>첨부 사진</strong>
                <span>{selectedInquiry.attachments.length}장</span>
              </div>
              {selectedInquiry.attachments.length > 0 ? (
                <div className="attachmentDownloadList">
                  {selectedInquiry.attachments.map((attachment) => (
                    <a
                      download={attachment.fileName}
                      href={attachment.url}
                      key={attachment.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className={`attachmentFileIcon ${attachment.tone}`} />
                      <div>
                        <strong>{attachment.fileName}</strong>
                        <small>{attachment.alt}</small>
                      </div>
                      <em>다운로드</em>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="emptyAttachment">첨부된 사진이 없어요.</div>
              )}
            </div>

            <form className="answerComposer" onSubmit={submitAnswer}>
              <label>
                답변 작성
                <textarea
                  disabled={selectedInquiry.status === 'answered'}
                  placeholder="고객에게 전달할 답변을 입력해 주세요."
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                />
              </label>
              <div className="answerActionRow">
                {selectedInquiry.status === 'answered' ? (
                  <span>
                    {selectedInquiry.answeredAt ?? '답변 완료'}에 답변 완료
                  </span>
                ) : (
                  <span>작성 완료 시 답변 대기 건수가 바로 줄어들어요.</span>
                )}
                <button
                  disabled={
                    selectedInquiry.status === 'answered' || !answerText.trim()
                  }
                  type="submit"
                >
                  답변 완료
                </button>
              </div>
            </form>
          </div>
        </article>
      ) : (
        <article className="panel emptyState">
          {inquiryFilter === 'waiting'
            ? '답변을 기다리는 문의가 없어요.'
            : '처리 완료된 문의가 없어요.'}
        </article>
      )}
      {isAnswerConfirmOpen && selectedInquiry ? (
        <div className="supportAnswerBackdrop" role="presentation">
          <section
            aria-labelledby="support-answer-confirm-title"
            aria-modal="true"
            className="supportAnswerDialog"
            role="dialog"
          >
            <h2 id="support-answer-confirm-title">답변을 완료할까요?</h2>
            <p>{selectedInquiry.userName}님에게 답변이 전달됩니다.</p>
            <div className="supportAnswerDialogActions">
              <button
                disabled={isSubmittingAnswer}
                type="button"
                onClick={() => setIsAnswerConfirmOpen(false)}
              >
                취소
              </button>
              <button disabled={isSubmittingAnswer} type="button" onClick={confirmAnswer}>
                {isSubmittingAnswer ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">답변 저장 중</span>
                  </>
                ) : (
                  '답변 완료'
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
type BadgeStatus = keyof typeof statusLabel;

type UserAvatarProps = {
  displayName: string;
  photoURL: string | null;
};

function getAvatarInitial(displayName: string) {
  return displayName.trim().slice(0, 1) || '?';
}

function getUsablePhotoURL(photoURL: string | null) {
  if (typeof photoURL !== 'string') {
    return null;
  }

  const trimmedPhotoURL = photoURL.trim();
  if (!trimmedPhotoURL || /^(null|undefined)$/i.test(trimmedPhotoURL)) {
    return null;
  }

  return /^(https?:\/\/|data:image\/|blob:)/i.test(trimmedPhotoURL)
    ? trimmedPhotoURL
    : null;
}

function formatWeeklyTrend(delta: number) {
  if (delta > 0) {
    return `지난주 대비 +${delta}`;
  }

  if (delta < 0) {
    return `지난주 대비 ${delta}`;
  }

  return '지난주와 동일';
}

function formatToday() {
  const date = new Date();
  const pad = (input: number) => String(input).padStart(2, '0');

  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function createRestoreDatabaseId(snapshotTime: string) {
  const compactSnapshot = snapshotTime
    .replace(/[^0-9]/g, '')
    .slice(0, 12);

  return `mypot-restore-${compactSnapshot || Date.now()}`;
}

function parseVersion(version: string) {
  const [major = 0, minor = 0, patch = 0] = version
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

  return { major, minor, patch };
}

function compareSemanticVersion(leftVersion: string, rightVersion: string) {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}

function compareVersionNotes(left: VersionNote, right: VersionNote) {
  return compareSemanticVersion(right.version, left.version);
}

function getNextPatchVersion(notes: VersionNote[]) {
  const latest = [...notes].sort(compareVersionNotes)[0];

  if (!latest) {
    return '1.0.0';
  }

  const version = parseVersion(latest.version);
  return `${version.major}.${version.minor}.${version.patch + 1}`;
}

function createVersionNoteDraft(version: string, isFirstRelease: boolean): VersionNote {
  return {
    id: `version_${version}`,
    version,
    releasedAt: formatToday(),
    summary: '새 버전 노트를 작성 중입니다.',
    patches: [
      {
        title: '새 업데이트 제목',
        description: '앱에 반영할 변경 내용을 입력해 주세요.',
      },
    ],
    releaseType: isFirstRelease ? 'major' : 'patch',
    status: 'draft',
  };
}

function ensureVersionNoteDraft(notes: VersionNote[]) {
  const sortedNotes = [...notes].sort(compareVersionNotes);
  if (sortedNotes.some((note) => note.status === 'draft')) {
    return sortedNotes;
  }

  const version = getNextPatchVersion(sortedNotes);
  return [createVersionNoteDraft(version, sortedNotes.length === 0), ...sortedNotes];
}

function detectReleaseType(
  version: string,
  notes: VersionNote[],
  currentNoteId: string,
): VersionReleaseType {
  const previousNote = notes
    .filter((note) => note.id !== currentNoteId)
    .filter((note) => compareSemanticVersion(note.version, version) < 0)
    .sort(compareVersionNotes)[0];

  if (!previousNote) {
    return 'major';
  }

  const previous = parseVersion(previousNote.version);
  const current = parseVersion(version);

  if (current.major > previous.major) {
    return 'major';
  }

  if (current.minor > previous.minor) {
    return 'minor';
  }

  return 'patch';
}

function paginate<T>(items: T[], page: number) {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
}

function buildReportCountByUserId(reports: ContentReport[]) {
  return reports.reduce<Record<string, number>>((counts, report) => {
    if (report.status !== 'resolved') {
      return counts;
    }

    const targetUid = report.targetUid.trim();
    const targetId = report.targetId.trim();
    const authorUid = report.evidence.authorUid;
    const fallbackAuthorUid = typeof authorUid === 'string' ? authorUid.trim() : '';
    const userId =
      targetUid ||
      (report.targetType === 'user' ? targetId : '') ||
      fallbackAuthorUid;

    if (userId) {
      counts[userId] = (counts[userId] ?? 0) + 1;
    }

    return counts;
  }, {});
}

function UserAvatar({ displayName, photoURL }: UserAvatarProps) {
  const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null);
  const usablePhotoURL = getUsablePhotoURL(photoURL);

  if (usablePhotoURL && failedPhotoURL !== usablePhotoURL) {
    return (
      <img
        className="userAvatar"
        src={usablePhotoURL}
        alt={displayName}
        referrerPolicy="no-referrer"
        onError={() => setFailedPhotoURL(usablePhotoURL)}
      />
    );
  }

  return <span className="userAvatarFallback">{getAvatarInitial(displayName)}</span>;
}

function ReportCountBadge({ count }: { count: number }) {
  return <span className={`reportCountBadge ${count > 0 ? 'hasReports' : ''}`}>{count.toLocaleString('ko-KR')}건</span>;
}

function UserStatusBadge({ status }: { status: AdminUser['status'] }) {
  return <span className={`userStatusBadge ${status}`}>{status === 'suspended' ? '정지' : '활성'}</span>;
}

function ProviderBadge({ provider }: { provider: 'Kakao' | 'Apple' }) {
  const logo = provider === 'Kakao' ? kakaoLogo : appleLogo;
  const label = provider === 'Kakao' ? '카카오' : '애플';

  return (
    <span className="providerLogoBadge">
      <img src={logo} alt={label} />
    </span>
  );
}

function StatusBadge({ status }: { status: BadgeStatus }) {
  return <span className={`statusBadge ${status}`}>{statusLabel[status]}</span>;
}

export default App;
