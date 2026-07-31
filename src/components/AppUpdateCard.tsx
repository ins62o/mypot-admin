import appIcon from '../assets/app-icon.png';
import type { AppUpdateConfig } from '../types/admin';

type AppUpdateCardProps = {
  config: AppUpdateConfig;
  platform: 'android' | 'ios';
  preview?: boolean;
};

export function AppUpdateCard({
  config,
  platform,
  preview = false,
}: AppUpdateCardProps) {
  const platformConfig = config.platforms[platform];
  const visibleHighlights = config.highlights.slice(0, 3);

  return (
    <article className="updateWebCard">
      <div className="updateWebBrand">
        <div className="brandMark appIconMark">
          <img src={appIcon} alt="마이폿" />
        </div>
      </div>
      <p className="updateWebVersion">
        Version {platformConfig.latestVersion}
      </p>
      <h1>{config.title}</h1>

      <div className="updateWebHighlights">
        {visibleHighlights.map((highlight, index) => (
          <div key={`${highlight}-${index}`}>
            <span aria-hidden="true">{index + 1}</span>
            <p>{highlight}</p>
          </div>
        ))}
      </div>

      <div
        className={`updateWebActions ${
          config.mode === 'required' ? 'required' : 'optional'
        }`}
      >
        <a
          aria-disabled={preview}
          href={preview ? undefined : platformConfig.storeUrl}
          onClick={preview ? (event) => event.preventDefault() : undefined}
        >
          {config.buttonLabel}
        </a>
        {config.mode === 'optional' ? (
          <button disabled={!preview} type="button">
            {config.dismissLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
