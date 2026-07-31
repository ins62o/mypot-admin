import { useState } from 'react';

import type { DatabaseEnvironment } from '../services/firebaseAdminClient';
import { AppUpdateManagement } from './AppUpdateManagement';
import { MaintenanceManagement } from './MaintenanceManagement';

export function AppNoticeManagement({
  environment,
}: {
  environment: DatabaseEnvironment;
}) {
  const [tab, setTab] = useState<'maintenance' | 'update'>('update');

  return (
    <section className="appNoticePage">
      <div className="appNoticeTabs" role="tablist" aria-label="앱 공지 유형">
        <button
          aria-selected={tab === 'update'}
          className={tab === 'update' ? 'active' : ''}
          role="tab"
          type="button"
          onClick={() => setTab('update')}
        >
          업데이트 안내
        </button>
        <button
          aria-selected={tab === 'maintenance'}
          className={tab === 'maintenance' ? 'active' : ''}
          role="tab"
          type="button"
          onClick={() => setTab('maintenance')}
        >
          점검 안내
        </button>
      </div>
      {tab === 'update' ? (
        <AppUpdateManagement environment={environment} />
      ) : (
        <MaintenanceManagement environment={environment} />
      )}
    </section>
  );
}
