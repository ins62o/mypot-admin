import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import {
  loadAdminMaintenanceConfig,
  saveAdminMaintenanceConfig,
  type DatabaseEnvironment,
} from '../services/firebaseAdminClient';
import type { MaintenanceConfig } from '../types/admin';
import { MaintenanceCard } from './MaintenanceCard';
import { MypotDateTimePicker } from './MypotDateTimePicker';

const defaultConfig: MaintenanceConfig = {
  blocksApp: true,
  buttonLabel: '점검 현황 확인',
  enabled: false,
  endsAt: '',
  publishedAt: null,
  schemaVersion: 1,
  startsAt: '',
  status: 'in_progress',
  statusPageUrl: '',
  summary: '원활한 서비스를 위해 점검을 진행합니다.',
  title: '마이폿 점검 중',
};

export function MaintenanceManagement({
  environment,
}: {
  environment: DatabaseEnvironment;
}) {
  const [config, setConfig] = useState(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<'end' | 'publish' | null>(null);
  const [message, setMessage] = useState('');
  const webViewUrl = 'https://admin.mypot.kr/maintenance';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    loadAdminMaintenanceConfig(environment)
      .then((loaded) => {
        if (isMounted) {
          setConfig({
            ...loaded,
            summary:
              loaded.summary === '더 안정적인 서비스를 위해 잠시 점검을 진행합니다.'
                ? defaultConfig.summary
                : loaded.summary,
            title:
              loaded.title === '마이폿이 잠시 쉬어가요'
                ? defaultConfig.title
                : loaded.title,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setConfig(defaultConfig);
          setMessage('저장된 설정이 없어 기본 초안을 보여드려요.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [environment]);

  function requestPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = Date.parse(config.startsAt);
    const endsAt = Date.parse(config.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
      setMessage('점검 시작과 종료 시간을 모두 선택해 주세요.');
      return;
    }
    if (endsAt <= startsAt) {
      setMessage('종료 시간은 시작 시간보다 뒤여야 해요.');
      return;
    }
    if (!isSaving) setPendingAction('publish');
  }

  async function applyMaintenance(enabled: boolean) {
    if (isSaving) return;
    try {
      setPendingAction(null);
      setIsSaving(true);
      setMessage('');
      const saved = await saveAdminMaintenanceConfig(
        {
          ...config,
          blocksApp: true,
          buttonLabel: '',
          enabled,
          status: 'in_progress',
          statusPageUrl: '',
        },
        environment,
      );
      setConfig(saved);
      setMessage(enabled ? '점검 안내를 게시했어요.' : '점검을 종료했어요.');
    } catch {
      setMessage('점검 상태를 변경하지 못했어요. 내용을 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webViewUrl);
      setIsUrlCopied(true);
      window.setTimeout(() => setIsUrlCopied(false), 1600);
    } catch {
      setMessage('웹뷰 주소를 복사하지 못했어요.');
    }
  }

  const environmentLabel = environment === 'production' ? '운영' : '개발';

  return (
    <section className="updateManagerLayout">
      <form className="panel updateManagerForm" onSubmit={requestPublish}>
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Maintenance notice</p>
            <h2>{environmentLabel} 점검 안내</h2>
          </div>
          <span className={`maintenanceLiveState ${config.enabled ? 'active' : ''}`}>
            {config.enabled ? '점검 중' : '점검 종료'}
          </span>
        </div>

        <div className="updateManagerBody">
          <div className="updateFieldGrid">
            <MypotDateTimePicker
              label="점검 시작"
              value={config.startsAt}
              onChange={(startsAt) => setConfig({ ...config, startsAt })}
            />
            <MypotDateTimePicker
              label="점검 종료"
              value={config.endsAt}
              onChange={(endsAt) => setConfig({ ...config, endsAt })}
            />
            <label className="wideField">
              제목
              <input
                value={config.title}
                onChange={(event) => setConfig({ ...config, title: event.target.value })}
              />
            </label>
            <label className="wideField">
              설명
              <textarea
                value={config.summary}
                onChange={(event) => setConfig({ ...config, summary: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="updatePublishBar">
          <div className="maintenancePublishCopy">
            <strong>
              점검을 게시하면 앱 시작 시 바로 표시되고, 점검 종료 전까지 앱 이용을
              차단해요.
            </strong>
            {isLoading ? <span>설정을 불러오는 중이에요.</span> : null}
            {message ? <span>{message}</span> : null}
            {config.publishedAt ? (
              <small>최근 게시 {new Date(config.publishedAt).toLocaleString('ko-KR')}</small>
            ) : null}
          </div>
          <div className="maintenancePublishActions">
            {config.enabled ? (
              <button
                className="maintenanceEndButton"
                disabled={isLoading || isSaving}
                type="button"
                onClick={() => setPendingAction('end')}
              >
                점검 종료
              </button>
            ) : (
              <button disabled={isLoading || isSaving} type="submit">
                {isSaving ? '처리 중' : '점검 게시'}
              </button>
            )}
          </div>
        </div>
      </form>

      <aside className="panel updatePreviewPanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">WebView</p>
            <h2>모바일 미리보기</h2>
          </div>
          <span>점검 안내</span>
        </div>
        <div className="updatePhonePreview">
          <div className="updatePhoneScreen">
            <MaintenanceCard config={config} preview />
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
              onClick={copyUrl}
            >
              {isUrlCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {pendingAction ? (
        <div className="updatePublishConfirmBackdrop" role="presentation">
          <section
            aria-labelledby="maintenance-confirm-title"
            aria-modal="true"
            className="updatePublishConfirmDialog"
            role="dialog"
          >
            <span className={pendingAction === 'end' ? 'required' : 'optional'}>
              {pendingAction === 'end' ? '점검 종료' : '점검 중'}
            </span>
            <h2 id="maintenance-confirm-title">
              {pendingAction === 'end' ? '점검을 종료할까요?' : '점검 안내를 게시할까요?'}
            </h2>
            <p>
              {pendingAction === 'end'
                ? '앱 시작 시 점검 안내가 더 이상 표시되지 않습니다.'
                : '즉시 반영되며 앱 시작 시 점검 안내가 표시됩니다.'}
            </p>
            <div>
              <button type="button" onClick={() => setPendingAction(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => applyMaintenance(pendingAction === 'publish')}
              >
                확인
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
