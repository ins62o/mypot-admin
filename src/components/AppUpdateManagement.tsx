import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy } from 'lucide-react';

import {
  deleteLatestAdminAppUpdateRelease,
  loadAdminAppUpdateConfig,
  loadAdminAppUpdateReleases,
  saveAdminAppUpdateConfig,
  type DatabaseEnvironment,
} from '../services/firebaseAdminClient';
import type { AppUpdateConfig, AppUpdateRelease } from '../types/admin';
import { AppUpdateCard } from './AppUpdateCard';

const FIXED_UPDATE_TITLE = '마이폿이 새로워졌어요';
const FIXED_UPDATE_BUTTON_LABEL = '업데이트';
const FIXED_DISMISS_LABEL = '나중에 하기';

const defaultConfig: AppUpdateConfig = {
  buttonLabel: FIXED_UPDATE_BUTTON_LABEL,
  dismissLabel: FIXED_DISMISS_LABEL,
  enabled: true,
  highlights: [
    '더 안정적인 마이폿 경험을 준비했어요.',
    '새로운 기능과 사용성 개선이 포함됐어요.',
  ],
  mode: 'optional',
  platforms: {
    android: {
      latestVersion: '1.0.1',
      minimumVersion: '1.0.0',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.mypot',
    },
    ios: {
      latestVersion: '1.0.1',
      minimumVersion: '1.0.0',
      storeUrl: 'https://apps.apple.com/',
    },
  },
  publishedAt: null,
  schemaVersion: 1,
  summary: '',
  title: FIXED_UPDATE_TITLE,
};

export function AppUpdateManagement({
  environment,
}: {
  environment: DatabaseEnvironment;
}) {
  const [config, setConfig] = useState<AppUpdateConfig>(defaultConfig);
  const [platform, setPlatform] = useState<'android' | 'ios'>('ios');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [releasePendingDeletion, setReleasePendingDeletion] =
    useState<AppUpdateRelease | null>(null);
  const [isDeletingRelease, setIsDeletingRelease] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [releases, setReleases] = useState<AppUpdateRelease[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setMessage('');

    loadAdminAppUpdateConfig(environment)
      .then((loadedConfig) => {
        if (isMounted) {
          setConfig({
            ...loadedConfig,
            buttonLabel: FIXED_UPDATE_BUTTON_LABEL,
            dismissLabel: FIXED_DISMISS_LABEL,
            highlights: loadedConfig.highlights.slice(0, 3),
            summary: '',
            title: FIXED_UPDATE_TITLE,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage('저장된 설정이 없어 기본 초안을 보여드려요.');
          setConfig(defaultConfig);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    loadAdminAppUpdateReleases(environment)
      .then((loadedReleases) => {
        if (isMounted) setReleases(loadedReleases);
      })
      .catch(() => {
        if (isMounted) setReleases([]);
      });

    return () => {
      isMounted = false;
    };
  }, [environment]);

  function updatePlatform(
    field: 'latestVersion' | 'storeUrl',
    value: string,
  ) {
    setConfig((current) => ({
      ...current,
      platforms: {
        ...current.platforms,
        [platform]: {
          ...current.platforms[platform],
          [field]: value,
        },
      },
    }));
  }

  function updateHighlight(index: number, value: string) {
    setConfig((current) => ({
      ...current,
      highlights: current.highlights.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  }

  function requestPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) setIsPublishConfirmOpen(true);
  }

  async function publish() {
    if (isSaving) return;

    try {
      setIsPublishConfirmOpen(false);
      setIsSaving(true);
      setMessage('');
      const savedConfig = await saveAdminAppUpdateConfig(
        {
          ...config,
          buttonLabel: FIXED_UPDATE_BUTTON_LABEL,
          dismissLabel: FIXED_DISMISS_LABEL,
          summary: '',
          title: FIXED_UPDATE_TITLE,
        },
        environment,
      );
      setConfig(savedConfig);
      setReleases(await loadAdminAppUpdateReleases(environment));
      setMessage('새 업데이트를 게시하고 사용자에게 적용했어요.');
    } catch {
      setMessage('게시하지 못했어요. 버전과 스토어 주소를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLatestRelease() {
    if (!releasePendingDeletion || isDeletingRelease) return;

    try {
      setIsDeletingRelease(true);
      setMessage('');
      const restoredConfig = await deleteLatestAdminAppUpdateRelease(
        releasePendingDeletion.id,
        environment,
      );
      setConfig({
        ...restoredConfig,
        buttonLabel: FIXED_UPDATE_BUTTON_LABEL,
        dismissLabel: FIXED_DISMISS_LABEL,
        highlights: restoredConfig.highlights.slice(0, 3),
        summary: '',
        title: FIXED_UPDATE_TITLE,
      });
      setReleases(await loadAdminAppUpdateReleases(environment));
      setReleasePendingDeletion(null);
      setMessage(
        restoredConfig.enabled
          ? '최근 게시를 취소하고 직전 업데이트 설정으로 복원했어요.'
          : '최근 게시를 취소하고 업데이트 안내를 종료했어요.',
      );
    } catch {
      setMessage('게시를 취소하지 못했어요. 목록을 새로고침한 뒤 다시 시도해 주세요.');
    } finally {
      setIsDeletingRelease(false);
    }
  }

  const environmentLabel = environment === 'production' ? '운영' : '개발';
  const webViewUrl =
    `https://admin.mypot.kr/app-update/index.html?platform=${platform}`;

  async function copyWebViewUrl() {
    try {
      await navigator.clipboard.writeText(webViewUrl);
      setIsUrlCopied(true);
      window.setTimeout(() => setIsUrlCopied(false), 1600);
    } catch {
      setMessage('웹뷰 주소를 복사하지 못했어요.');
    }
  }

  return (
    <section className="updateManagerLayout">
      <form className="panel updateManagerForm" onSubmit={requestPublish}>
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Update prompt</p>
            <h2>{environmentLabel} 업데이트 안내</h2>
          </div>
          <span className="updatePublishPolicy">게시 즉시 적용</span>
        </div>

        <div className="updateManagerBody">
          <div className="updateModeGroup">
            <span>업데이트 방식</span>
            <div>
              {(['optional', 'required'] as const).map((mode) => (
                <button
                  className={config.mode === mode ? 'active' : ''}
                  key={mode}
                  type="button"
                  onClick={() => setConfig({ ...config, mode })}
                >
                  {mode === 'optional' ? '선택 업데이트' : '강제 업데이트'}
                </button>
              ))}
            </div>
          </div>

          <div className="updatePlatformTabs">
            {(['ios', 'android'] as const).map((item) => (
              <button
                className={platform === item ? 'active' : ''}
                key={item}
                type="button"
                onClick={() => setPlatform(item)}
              >
                {item === 'ios' ? 'iOS' : 'Android'}
              </button>
            ))}
          </div>

          <div className="updateFieldGrid">
            <label>
              최신 버전
              <input
                value={config.platforms[platform].latestVersion}
                onChange={(event) => updatePlatform('latestVersion', event.target.value)}
              />
            </label>
            <label className="updateMinimumField">
              <span>
                <strong>최소 지원 버전</strong>
                <small>강제 업데이트를 게시하면 자동으로 올라가요.</small>
              </span>
              <input
                aria-label="최소 지원 버전"
                readOnly
                value={config.platforms[platform].minimumVersion}
              />
            </label>
            <label className="wideField">
              스토어 주소
              <input
                value={config.platforms[platform].storeUrl}
                onChange={(event) => updatePlatform('storeUrl', event.target.value)}
              />
            </label>
          </div>

          <div className="updateHighlightEditor">
            <div>
              <div>
                <h3>업데이트 내용</h3>
                <small>PC와 모바일 모두 최대 3개까지 작성할 수 있어요.</small>
              </div>
              <button
                disabled={config.highlights.length >= 3}
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    highlights: [...config.highlights, '새로운 업데이트 내용'],
                  })
                }
              >
                항목 추가
              </button>
            </div>
            {config.highlights.map((highlight, index) => (
              <label key={index}>
                <span>{index + 1}</span>
                <input
                  value={highlight}
                  onChange={(event) => updateHighlight(index, event.target.value)}
                />
                <button
                  disabled={config.highlights.length <= 1}
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      highlights: config.highlights.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  삭제
                </button>
              </label>
            ))}
          </div>

        </div>

        <div className="updateReleaseHistory">
          <div>
            <h3>업데이트 게시 이력</h3>
            <small>사용자에게는 항상 가장 최근 게시물의 내용만 보여요.</small>
          </div>
          {releases.length > 0 ? (
            <div className="updateReleaseList">
              {releases.map((release, index) => (
                <article key={release.id}>
                  <div>
                    <strong>
                      iOS {release.platforms.ios.latestVersion} · Android{' '}
                      {release.platforms.android.latestVersion}
                    </strong>
                    <span className={release.mode}>
                      {release.mode === 'required' ? '강제 업데이트' : '선택 업데이트'}
                    </span>
                  </div>
                  <p>{release.title}</p>
                  <div className="updateReleaseFooter">
                    <small>
                      {release.publishedAt
                        ? new Date(release.publishedAt).toLocaleString('ko-KR')
                        : '방금 게시'}
                    </small>
                    {index === 0 ? (
                      <button
                        aria-label="최근 업데이트 게시 취소"
                        className="updateReleaseDelete"
                        disabled={isDeletingRelease}
                        title="최근 게시 취소"
                        type="button"
                        onClick={() => setReleasePendingDeletion(release)}
                      >
                        게시 취소
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="updateReleaseEmpty">아직 게시한 업데이트가 없어요.</p>
          )}
        </div>

        <div className="updatePublishBar">
          <div>
            {isLoading ? '설정을 불러오는 중이에요.' : message}
            {config.publishedAt ? (
              <small>
                최근 게시 {new Date(config.publishedAt).toLocaleString('ko-KR')}
              </small>
            ) : null}
          </div>
          <button disabled={isLoading || isSaving} type="submit">
            {isSaving ? '게시 중' : '새 업데이트 게시'}
          </button>
        </div>
      </form>

      <aside className="panel updatePreviewPanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">WebView</p>
            <h2>모바일 미리보기</h2>
          </div>
          <span>{platform === 'ios' ? 'iOS' : 'Android'}</span>
        </div>
        <div className="updatePhonePreview">
          <div className="updatePhoneScreen">
            <AppUpdateCard config={config} platform={platform} preview />
          </div>
        </div>
        <div className="updateWebViewUrl">
          <span>웹뷰 주소</span>
          <div>
            <code>{webViewUrl}</code>
            <button
              aria-label={isUrlCopied ? '복사 완료' : '웹뷰 주소 복사'}
              title={isUrlCopied ? '복사 완료' : '주소 복사'}
              type="button"
              onClick={copyWebViewUrl}
            >
              {isUrlCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {isPublishConfirmOpen ? (
        <div className="updatePublishConfirmBackdrop" role="presentation">
          <section
            aria-labelledby="update-publish-confirm-title"
            aria-modal="true"
            className="updatePublishConfirmDialog"
            role="dialog"
          >
            <span className={config.mode}>
              {config.mode === 'required' ? '강제 업데이트' : '선택 업데이트'}
            </span>
            <h2 id="update-publish-confirm-title">이 업데이트를 게시할까요?</h2>
            <p>즉시 반영되고 게시 이력이 저장됩니다.</p>
            {config.mode === 'required' ? (
              <strong>강제 업데이트는 이전 버전 사용자의 앱 이용을 제한할 수 있어요.</strong>
            ) : null}
            <div>
              <button type="button" onClick={() => setIsPublishConfirmOpen(false)}>
                취소
              </button>
              <button type="button" onClick={publish}>
                확인
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {releasePendingDeletion ? (
        <div className="updatePublishConfirmBackdrop" role="presentation">
          <section
            aria-labelledby="update-release-delete-title"
            aria-modal="true"
            className="updatePublishConfirmDialog"
            role="dialog"
          >
            <span className="updateConfirmBadge">게시 취소</span>
            <h2 id="update-release-delete-title">
              최근 업데이트 게시를 취소할까요?
            </h2>
            <p>
              사용자에게 즉시 반영되며, 직전 업데이트 설정과 최소 지원
              버전으로 복원됩니다.
            </p>
            <strong>
              iOS {releasePendingDeletion.platforms.ios.latestVersion} · Android{' '}
              {releasePendingDeletion.platforms.android.latestVersion}
            </strong>
            <div>
              <button
                disabled={isDeletingRelease}
                type="button"
                onClick={() => setReleasePendingDeletion(null)}
              >
                취소
              </button>
              <button
                disabled={isDeletingRelease}
                type="button"
                onClick={() => void deleteLatestRelease()}
              >
                {isDeletingRelease ? '취소 중' : '게시 취소'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
