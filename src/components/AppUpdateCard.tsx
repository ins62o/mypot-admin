import appIcon from '../assets/app-icon.png';
import type { AppUpdateConfig } from '../types/admin';

const UPDATE_TITLE = '마이폿이 새로워졌어요';
const UPDATE_BUTTON_LABEL = '업데이트';
const DISMISS_BUTTON_LABEL = '나중에 하기';

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
      <h1>{UPDATE_TITLE}</h1>

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
          {UPDATE_BUTTON_LABEL}
        </a>
        {config.mode === 'optional' ? (
          <button disabled={preview} type="button">
            {DISMISS_BUTTON_LABEL}
          </button>
        ) : null}
      </div>
    </article>
  );
}
