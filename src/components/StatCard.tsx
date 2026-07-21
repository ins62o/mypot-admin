import type { ReactNode } from 'react';

type StatCardProps = {
  caption: string;
  icon: ReactNode;
  label: string;
  trend?: string;
  value: string;
};

export function StatCard({ caption, icon, label, trend, value }: StatCardProps) {
  const trendTone = trend?.includes('-') ? 'down' : 'up';

  return (
    <section className="statCard">
      <div className="statIcon">{icon}</div>
      <div className="statText">
        <p className="mutedLabel">{label}</p>
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>
      {trend ? (
        <div className={`statTrend ${trendTone}`}>{trend}</div>
      ) : null}
    </section>
  );
}
