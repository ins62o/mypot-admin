import { Clock3, ShieldCheck } from 'lucide-react';

import appIcon from '../assets/app-icon.png';
import type { MaintenanceConfig } from '../types/admin';

export function MaintenanceCard({
  config,
}: {
  config: MaintenanceConfig;
  preview?: boolean;
}) {
  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '시간을 선택해 주세요';
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <article className="maintenanceWebCard">
      <div className="maintenanceBrand">
        <div className="brandMark appIconMark">
          <img src={appIcon} alt="마이폿" />
        </div>
        <span className="maintenanceStatus in_progress">점검 중</span>
      </div>

      <h1>{config.title}</h1>
      <p className="maintenanceSummary">{config.summary}</p>

      <div className="maintenanceSchedule">
        <Clock3 aria-hidden="true" size={18} />
        <div>
          <span>점검 시간</span>
          <strong>{formatDateTime(config.startsAt)}부터</strong>
          <strong>{formatDateTime(config.endsAt)}까지</strong>
        </div>
      </div>

      <div className="maintenanceNotice">
        <ShieldCheck aria-hidden="true" size={18} />
        <p>
          점검 중에는 마이폿을 이용할 수 없어요.
        </p>
      </div>
    </article>
  );
}
