import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Database,
  FileText,
  Inbox,
  Layers3,
  MessageCircle,
  RotateCw,
  Users,
} from 'lucide-react';

import appIcon from './assets/app-icon.png';
import appleLogo from './assets/social/apple-login.svg';
import kakaoLogo from './assets/social/kakao-login.svg';
import { AdminSearch } from './components/AdminSearch';
import { StatCard } from './components/StatCard';
import type { AdminDashboardMetrics, AdminPocket, AdminUser, DatabaseBackup, DatabaseBackupStatus, SupportInquiry, VersionNote, VersionReleaseType } from './types/admin';
import {
  answerSupportInquiry as answerSupportInquiryRemote,
  isFirebaseConfigured,
  loadAdminDashboardMetrics,
  loadAdminDatabaseStatus,
  loadAdminPockets,
  loadAdminSupportInquiries,
  loadAdminUsers,
  loadAdminVersionNotes,
  loginAdminWithEmail,
  logoutAdmin,
  saveAdminVersionNote,
  startAdminDatabaseRestore,
  subscribeToAdminSession,
} from './services/firebaseAdminClient';
import './styles.css';

const PAGE_SIZE = 10;

type AdminPage = 'dashboard' | 'database' | 'versions' | 'support';
type PocketSortKey = 'memberCount' | 'recordCount' | 'level' | 'status';
type DataSourceStatus = 'firebase' | 'loading' | 'error';

const statusLabel = {
  active: '운영중',
  answered: '답변 완료',
  draft: '작성중',
  pendingDeletion: '삭제 대기',
  published: '배포됨',
  waiting: '답변 대기',
} as const;

const pocketSortLabels: Record<PocketSortKey, string> = {
  memberCount: '구성원',
  level: '레벨',
  recordCount: '기록',
  status: '상태',
};

const pageTitle: Record<AdminPage, string> = {
  database: 'DB 현황',
  dashboard: '대시보드',
  support: '1:1 문의',
  versions: '버전 노트',
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pockets, setPockets] = useState<AdminPocket[]>([]);
  const [versionNotes, setVersionNotes] = useState<VersionNote[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<SupportInquiry[]>([]);
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');
  const [firebaseStatusMessage, setFirebaseStatusMessage] = useState('운영 Firebase 연결 대기 중');
  const [databaseDataSourceStatus, setDatabaseDataSourceStatus] =
    useState<DataSourceStatus>('loading');
  const [databaseStatusMessage, setDatabaseStatusMessage] =
    useState('운영 Firebase DB 연결 대기 중');
  const [databaseBackupStatus, setDatabaseBackupStatus] =
    useState<DatabaseBackupStatus | null>(null);
  const [dashboardMetrics, setDashboardMetrics] =
    useState<AdminDashboardMetrics>({ pocketWeeklyDelta: 0, userWeeklyDelta: 0 });
  const [selectedVersionId, setSelectedVersionId] = useState('');

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

  useEffect(() => {
    return subscribeToAdminSession((user) => {
      setIsAuthenticated(Boolean(user));
      setIsCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    setDataSourceStatus('loading');
    setFirebaseStatusMessage('운영 Firebase 데이터 불러오는 중');
    setDatabaseDataSourceStatus('loading');
    setDatabaseStatusMessage('운영 Firebase DB 현황 불러오는 중');

    Promise.allSettled([
      loadAdminUsers(),
      loadAdminPockets(),
      loadAdminVersionNotes(),
      loadAdminSupportInquiries(),
      loadAdminDatabaseStatus(),
      loadAdminDashboardMetrics(),
    ]).then(([loadedUsers, loadedPockets, loadedNotes, loadedInquiries, loadedDatabase, loadedMetrics]) => {
      if (!isMounted) {
        return;
      }

      if (loadedUsers.status === 'fulfilled') {
        setUsers(loadedUsers.value);
      }
      if (loadedPockets.status === 'fulfilled') {
        setPockets(loadedPockets.value);
      }
      if (loadedNotes.status === 'fulfilled') {
        setVersionNotes(loadedNotes.value);
        setSelectedVersionId(loadedNotes.value[0]?.id ?? '');
      }
      if (loadedInquiries.status === 'fulfilled') {
        setSupportInquiries(
          loadedInquiries.value.filter((inquiry) => inquiry.status === 'waiting'),
        );
      }
      if (loadedDatabase.status === 'fulfilled') {
        setDatabaseBackupStatus(loadedDatabase.value);
        setDatabaseDataSourceStatus('firebase');
        setDatabaseStatusMessage('운영 Firebase 연결됨');
      } else {
        setDatabaseBackupStatus(null);
        setDatabaseDataSourceStatus('error');
        setDatabaseStatusMessage('운영 Firebase DB 연결 실패');
      }
      if (loadedMetrics.status === 'fulfilled') {
        setDashboardMetrics(loadedMetrics.value);
      }

      if (
        loadedUsers.status === 'rejected' ||
        loadedPockets.status === 'rejected'
      ) {
        setUsers([]);
        setPockets([]);
        setDataSourceStatus('error');
        setFirebaseStatusMessage('운영 Firebase 데이터 호출 실패');
        return;
      }

      setDataSourceStatus('firebase');
      setFirebaseStatusMessage('운영 Firebase 연결됨');
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFirebaseConfigured) {
      setLoginError('운영 Firebase 환경 변수가 설정되지 않았어요.');
      return;
    }

    try {
      setLoginError('');
      await loginAdminWithEmail(loginId.trim(), loginPassword);
      setLoginPassword('');
    } catch {
      setLoginError('Firebase 이메일 또는 비밀번호를 확인해 주세요.');
    }
  }

  if (isCheckingSession) {
    return (
      <main className="loginPage">
        <div className="sessionLoader" aria-label="관리자 접근 확인 중" />
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
            이메일
            <input
              autoComplete="email"
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
            <span>운영 콘솔</span>
          </div>
        </div>

        <nav className="navList" aria-label="관리자 메뉴">
          <button
            className={page === 'dashboard' ? 'active' : ''}
            type="button"
            onClick={() => setPage('dashboard')}
          >
            <Database size={18} /> 대시보드
          </button>

          <button
            className={page === 'versions' ? 'active' : ''}
            type="button"
            onClick={() => setPage('versions')}
          >
            <FileText size={18} /> 버전 노트
          </button>
          <button
            className={page === 'support' ? 'active' : ''}
            type="button"
            onClick={() => setPage('support')}
          >
            <Inbox size={18} /> 1:1 문의
            {waitingInquiryCount > 0 ? (
              <span className="navCount">{waitingInquiryCount}</span>
            ) : null}
          </button>
                    <button
            className={page === 'database' ? 'active' : ''}
            type="button"
            onClick={() => setPage('database')}
          >
            <RotateCw size={18} /> DB 현황
          </button>
        </nav>
      </aside>

      <main className="mainArea">
        <header className="topBar" id="dashboard">
          <div>
            <h1>{pageTitle[page]}</h1>
          </div>
          <button className="logoutButton" type="button" onClick={logoutAdmin}>
            로그아웃
          </button>
        </header>

        {page === 'dashboard' ? (
          <DashboardPage
            activePocketCount={activePocketCount}
            dataSourceStatus={dataSourceStatus}
            firebaseStatusMessage={firebaseStatusMessage}
            pendingDeletionPocketCount={pendingDeletionPocketCount}
            pockets={pockets}
            pocketWeeklyDelta={dashboardMetrics.pocketWeeklyDelta}
            userWeeklyDelta={dashboardMetrics.userWeeklyDelta}
            users={users}
          />
        ) : null}

        {page === 'database' ? (
          <DatabaseStatusPage
            databaseBackupStatus={databaseBackupStatus}
            dataSourceStatus={databaseDataSourceStatus}
            firebaseStatusMessage={databaseStatusMessage}
          />
        ) : null}

        {page === 'versions' ? (
          <VersionNotesPage
            notes={versionNotes}
            onChangeNotes={setVersionNotes}
            onSaveNote={saveAdminVersionNote}
            onSelectNote={setSelectedVersionId}
            selectedNote={selectedVersion}
          />
        ) : null}

        {page === 'support' ? (
          <SupportPage
            inquiries={supportInquiries}
            onAnswerInquiry={async (inquiry, answer) => {
              await answerSupportInquiryRemote(inquiry, answer);
              setSupportInquiries((currentInquiries) =>
                currentInquiries.filter((item) => item.id !== inquiry.id),
              );
            }}
            waitingCount={waitingInquiryCount}
          />
        ) : null}
      </main>
    </div>
  );
}

type DashboardPageProps = {
  activePocketCount: number;
  dataSourceStatus: DataSourceStatus;
  firebaseStatusMessage: string;
  pendingDeletionPocketCount: number;
  pockets: AdminPocket[];
  pocketWeeklyDelta: number;
  userWeeklyDelta: number;
  users: AdminUser[];
};

function DashboardPage({
  activePocketCount,
  dataSourceStatus,
  firebaseStatusMessage,
  pendingDeletionPocketCount,
  pockets,
  pocketWeeklyDelta,
  userWeeklyDelta,
  users,
}: DashboardPageProps) {
  const [userQuery, setUserQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [pocketPage, setPocketPage] = useState(1);
  const [pocketSortKey, setPocketSortKey] =
    useState<PocketSortKey>('memberCount');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [user.displayName, user.email, user.id]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [userQuery, users]);

  const sortedPockets = useMemo(() => {
    return [...pockets].sort((left, right) => {
      if (pocketSortKey === 'status') {
        return left.status.localeCompare(right.status);
      }

      return right[pocketSortKey] - left[pocketSortKey];
    });
  }, [pocketSortKey, pockets]);

  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pocketPageCount = Math.max(1, Math.ceil(sortedPockets.length / PAGE_SIZE));
  const visibleUsers = paginate(filteredUsers, userPage);
  const visiblePockets = paginate(sortedPockets, pocketPage);

  function updateUserQuery(value: string) {
    setUserQuery(value);
    setUserPage(1);
  }

  function updatePocketSort(nextSortKey: PocketSortKey) {
    setPocketSortKey(nextSortKey);
    setPocketPage(1);
  }

  return (
    <>
      <section className="statsGrid dashboardStats" aria-label="핵심 지표">
        <StatCard
          icon={<Users size={20} aria-hidden="true" />}
          label="전체 사용자"
          value={`${users.length.toLocaleString()}명`}
          caption="가입된 전체 사용자 합계"
          trend={formatWeeklyTrend(userWeeklyDelta)}
        />
        <StatCard
          icon={<Layers3 size={20} aria-hidden="true" />}
          label="전체 주머니"
          value={`${pockets.length.toLocaleString()}개`}
          caption={`운영중 ${activePocketCount}개 · 삭제 대기 ${pendingDeletionPocketCount}개`}
          trend={formatWeeklyTrend(pocketWeeklyDelta)}
        />
      </section>

      <section className="dashboardSplit">
        <article className="panel tallPanel" id="users">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Users</p>
              <h2>전체 사용자 목록</h2>
            </div>
            <AdminSearch
              value={userQuery}
              onChange={updateUserQuery}
              placeholder="이름, 이메일, UID 검색"
            />
          </div>

          <div className="tableWrap compactTable dashboardTableWrap">
            <table>
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>로그인</th>
                  <th>참여</th>
                  <th>가입일</th>
                  <th>최근 로그인</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="userCell">
                        <UserAvatar
                          displayName={user.displayName}
                          photoURL={user.photoURL}
                        />
                        <div>
                          <strong>{user.displayName}</strong>
                          <small>{user.email}</small>
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
                    <td className="emptyTableCell" colSpan={5}>
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
            totalCount={filteredUsers.length}
          />
        </article>

        <article className="panel tallPanel" id="pockets">
          <div className="panelHeader pocketPanelHeader">
            <div>
              <p className="eyebrow">Pockets</p>
              <h2>주머니 현황</h2>
            </div>
            <div className="filterGroup" aria-label="주머니 정렬">
              {(Object.keys(pocketSortLabels) as PocketSortKey[]).map(
                (sortKey) => (
                  <button
                    className={pocketSortKey === sortKey ? 'active' : ''}
                    key={sortKey}
                    type="button"
                    onClick={() => updatePocketSort(sortKey)}
                  >
                    {pocketSortLabels[sortKey]}
                  </button>
                ),
              )}
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
                  <tr key={pocketItem.id}>
                    <td>
                      <strong>{pocketItem.name}</strong>
                      <small className="tableSubText">{pocketItem.id}</small>
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
    </>
  );
}

type DatabaseStatusPageProps = {
  databaseBackupStatus: DatabaseBackupStatus | null;
  dataSourceStatus: DataSourceStatus;
  firebaseStatusMessage: string;
};

function DatabaseStatusPage({
  databaseBackupStatus,
  dataSourceStatus,
  firebaseStatusMessage,
}: DatabaseStatusPageProps) {
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreBackup, setRestoreBackup] = useState<DatabaseBackup | null>(null);
  const [restoreDatabaseId, setRestoreDatabaseId] = useState('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreSecondConfirm, setRestoreSecondConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

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
            <h2>운영 DB 현황</h2>
          </div>
          <span className={`dataSourcePill ${dataSourceStatus}`}>
            <i aria-hidden="true" />
            {firebaseStatusMessage}
          </span>
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
                복원하고 확인한 뒤 운영 전환하는 것입니다.
              </p>
              <small>
                백업 복원은 운영 DB를 바로 덮어쓰지 않고 선택한 백업 시점의
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
            운영 Firebase DB 현황을 불러오는 중이에요.
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
                이 작업은 운영 DB를 즉시 되돌리지 않습니다. 선택한 백업 시점의
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
  notes: VersionNote[];
  onChangeNotes: (notes: VersionNote[]) => void;
  onSaveNote: (note: VersionNote) => Promise<void> | void;
  onSelectNote: (id: string) => void;
  selectedNote: VersionNote | null;
};

function VersionNotesPage({
  notes,
  onChangeNotes,
  onSaveNote,
  onSelectNote,
  selectedNote,
}: VersionNotesPageProps) {
  const [saveMessage, setSaveMessage] = useState('');

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
    const version = getNextPatchVersion(notes);
    const newNote: VersionNote = {
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
      releaseType: 'patch',
      status: 'draft',
    };

    setSaveMessage(`${version} 새 노트 생성`);
    onChangeNotes([newNote, ...notes]);
    onSelectNote(newNote.id);
  }

  async function saveVersionNote() {
    if (!selectedNote) {
      return;
    }

    const releaseType = detectReleaseType(selectedNote.version, notes, selectedNote.id);
    const noteToSave = {
      ...selectedNote,
      releaseType,
      status: 'published' as const,
    };

    onChangeNotes(
      notes
        .map((note) => (note.id === selectedNote.id ? noteToSave : note))
        .sort(compareVersionNotes),
    );
    await onSaveNote(noteToSave);
    setSaveMessage(`${selectedNote.version} 저장 완료 · ${releaseTypeLabel[releaseType]}`);
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
            <h2>이전 버전 노트</h2>
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
                <span className={`releaseTypeTag ${note.releaseType}`}>{releaseTypeLabel[note.releaseType]}</span>
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
            <button type="button" onClick={saveVersionNote}>
              저장
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
          <label className="wideField">
            히스토리 요약
            <input
              value={selectedNote.summary}
              onChange={(event) =>
                updateSelectedNote({ ...selectedNote, summary: event.target.value })
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
                <span>최신</span>
              </div>
              <div className="appPatchDivider" />
              <div className="appPatchList">
                {selectedNote.patches.map((patch) => (
                  <div className="appPatchRow" key={patch.title}>
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
      </article>
      ) : (
        <article className="panel appPatchPreviewPanel emptyState">데이터 없음</article>
      )}
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
  const defaultInquiryId =
    inquiries.find((inquiry) => inquiry.status === 'waiting')?.id ??
    inquiries[0]?.id ??
    '';
  const [selectedInquiryId, setSelectedInquiryId] = useState(defaultInquiryId);
  const selectedInquiry =
    inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? inquiries[0];
  const [answerText, setAnswerText] = useState(selectedInquiry?.answer ?? '');

  useEffect(() => {
    setAnswerText(selectedInquiry?.answer ?? '');
  }, [selectedInquiry?.answer, selectedInquiry?.id]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInquiry || !answerText.trim()) {
      return;
    }

    onAnswerInquiry(selectedInquiry, answerText.trim());
  }

  return (
    <section className="supportDeskLayout">
      <aside className="panel supportQueuePanel">
        <div className="panelHeader compact">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>답변 대기</h2>
          </div>
          <strong className="supportQueueCount">{waitingCount}건</strong>
        </div>

        <div className="supportTicketList">
          {inquiries.map((inquiry) => (
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
          {inquiries.length === 0 ? (
            <div className="emptyTicketState">데이터 없음</div>
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
        <article className="panel emptyState">데이터 없음</article>
      )}
    </section>
  );
}
type BadgeStatus = keyof typeof statusLabel;

type UserAvatarProps = {
  displayName: string;
  photoURL: string | null;
};

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
    return 'patch';
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

function UserAvatar({ displayName, photoURL }: UserAvatarProps) {
  if (photoURL) {
    return <img className="userAvatar" src={photoURL} alt={displayName} />;
  }

  return <span className="userAvatarFallback">{displayName.slice(0, 1)}</span>;
}

function ProviderBadge({ provider }: { provider: 'Kakao' | 'Apple' }) {
  const logo = provider === 'Kakao' ? kakaoLogo : appleLogo;

  return (
    <span className="providerLogoBadge">
      <img src={logo} alt={provider} />
    </span>
  );
}

function StatusBadge({ status }: { status: BadgeStatus }) {
  return <span className={`statusBadge ${status}`}>{statusLabel[status]}</span>;
}

export default App;













