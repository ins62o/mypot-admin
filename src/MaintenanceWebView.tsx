import { useEffect, useState } from 'react';

import { MaintenanceCard } from './components/MaintenanceCard';
import { loadPublishedMaintenanceConfig } from './services/firebaseAdminClient';
import type { MaintenanceConfig } from './types/admin';
import './styles.css';

export function MaintenanceWebView() {
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadPublishedMaintenanceConfig()
      .then((loaded) => {
        if (isMounted) setConfig(loaded);
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="updateWebPage maintenanceWebPage">
      {config?.enabled ? (
        <MaintenanceCard config={config} />
      ) : hasError ? (
        <section className="updateWebState">
          <strong>점검 안내를 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요.</p>
        </section>
      ) : config ? (
        <section className="updateWebState">
          <strong>현재 진행 중인 점검이 없어요.</strong>
          <p>마이폿을 정상적으로 이용할 수 있어요.</p>
        </section>
      ) : (
        <section className="updateWebState">
          <strong>점검 안내를 불러오는 중이에요.</strong>
        </section>
      )}
    </main>
  );
}
