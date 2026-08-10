import { useEffect, useState } from 'react';

import { AppUpdateCard } from './components/AppUpdateCard';
import { loadPublishedAppUpdateConfig } from './services/firebaseAdminClient';
import type { AppUpdateConfig } from './types/admin';
import './styles.css';

function requestedPlatform(): 'android' | 'ios' {
  const platform = new URLSearchParams(window.location.search).get('platform');
  return platform === 'android' ? 'android' : 'ios';
}

function requestedVersion() {
  return new URLSearchParams(window.location.search).get('currentVersion')?.trim() ?? '';
}

function requestedEnvironment(): 'development' | 'production' {
  return new URLSearchParams(window.location.search).get('environment') ===
    'development'
    ? 'development'
    : 'production';
}

function compareVersions(left: string, right: string) {
  const parts = (value: string) =>
    value.split(/[+-]/, 1)[0].split('.').map((part) => Number.parseInt(part, 10) || 0);
  const leftParts = parts(left);
  const rightParts = parts(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

export function AppUpdateWebView() {
  const [config, setConfig] = useState<AppUpdateConfig | null>(null);
  const [hasError, setHasError] = useState(false);
  const platform = requestedPlatform();
  const environment = requestedEnvironment();
  const currentVersion = requestedVersion();
  const platformConfig = config?.platforms[platform];
  const isLatest = Boolean(
    currentVersion &&
      platformConfig &&
      compareVersions(currentVersion, platformConfig.latestVersion) >= 0,
  );
  const effectiveConfig = config && platformConfig && currentVersion
    ? {
        ...config,
        mode: compareVersions(currentVersion, platformConfig.minimumVersion) < 0
          ? 'required' as const
          : 'optional' as const,
      }
    : config;

  useEffect(() => {
    let isMounted = true;

    loadPublishedAppUpdateConfig(environment)
      .then((loadedConfig) => {
        if (isMounted) {
          setConfig(loadedConfig);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [environment]);

  return (
    <main className="updateWebPage">
      {effectiveConfig?.enabled && !isLatest ? (
        <AppUpdateCard config={effectiveConfig} platform={platform} />
      ) : hasError ? (
        <section className="updateWebState">
          <strong>업데이트 소식을 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요.</p>
        </section>
      ) : config ? (
        <section className="updateWebState">
          <strong>{isLatest ? '최신 버전의 마이폿이에요.' : '현재 안내 중인 업데이트가 없어요.'}</strong>
          <p>마이폿을 계속 편안하게 이용해 주세요.</p>
        </section>
      ) : (
        <section
          aria-label="업데이트 소식 불러오는 중"
          className="updateWebLoading"
          role="status"
        >
          <span aria-hidden="true" className="updateWebSpinner" />
        </section>
      )}
    </main>
  );
}
