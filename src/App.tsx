import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronDown,
  Database,
  FileText,
  Inbox,
  Layers3,
  LoaderCircle,
  MessageCircle,
  RotateCw,
  Users,
} from 'lucide-react';

import appIcon from './assets/app-icon.png';
import appleLogo from './assets/social/apple-login.svg';
import kakaoLogo from './assets/social/kakao-login.svg';
import { AdminSearch } from './components/AdminSearch';
import { StatCard } from './components/StatCard';
import type { AdminDashboardMetrics, AdminPocket, AdminPocketMember, AdminUser, DatabaseBackup, DatabaseBackupStatus, SupportInquiry, VersionNote, VersionReleaseType } from './types/admin';
import {
  answerSupportInquiry as answerSupportInquiryRemote,
  deleteAdminVersionNote,
  isFirebaseConfigured,
  loadAdminDashboardMetrics,
  loadAdminDatabaseStatus,
  loadAdminPockets,
  loadAdminPocketMembers,
  loadAdminSupportInquiries,
  loadAdminUsers,
  loadAdminVersionNotes,
  loginAdminWithEmail,
  logoutAdmin,
  saveAdminVersionNote,
  startAdminDatabaseRestore,
  subscribeToAdminSession,
  type DatabaseEnvironment,
} from './services/firebaseAdminClient';
import './styles.css';

const PAGE_SIZE = 10;
const DATABASE_ENVIRONMENT_STORAGE_KEY = 'mypot-admin-database-environment';

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
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
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
    useState('연결 중');
  const [databaseBackupStatus, setDatabaseBackupStatus] =
    useState<DatabaseBackupStatus | null>(null);
  const [databaseEnvironment, setDatabaseEnvironment] =
    useState<DatabaseEnvironment>(() => {
      try {
        const savedEnvironment = window.localStorage.getItem(
          DATABASE_ENVIRONMENT_STORAGE_KEY,
        );
        return savedEnvironment === 'development' ? 'development' : 'production';
      } catch {
        return 'production';
      }
    });
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
    const environmentLabel = databaseEnvironment === 'production' ? '운영' : '개발';
    setDataSourceStatus('loading');
    setFirebaseStatusMessage(`${environmentLabel} Firebase 데이터 불러오는 중`);
    Promise.allSettled([
      loadAdminUsers(databaseEnvironment),
      loadAdminPockets(databaseEnvironment),
      loadAdminVersionNotes(databaseEnvironment),
      loadAdminSupportInquiries(databaseEnvironment),
      loadAdminDashboardMetrics(databaseEnvironment),
    ]).then(([loadedUsers, loadedPockets, loadedNotes, loadedInquiries, loadedMetrics]) => {
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
        setFirebaseStatusMessage(`${environmentLabel} Firebase 데이터 호출 실패`);
        return;
      }

      setDataSourceStatus('firebase');
      setFirebaseStatusMessage(`${environmentLabel} Firebase 연결됨`);
    });

    return () => {
      isMounted = false;
    };
  }, [databaseEnvironment, isAuthenticated]);

  function handleDatabaseEnvironmentChange(environment: DatabaseEnvironment) {
    setDatabaseEnvironment(environment);
    try {
      window.localStorage.setItem(DATABASE_ENVIRONMENT_STORAGE_KEY, environment);
    } catch {
      // 환경 선택은 브라우저 저장소를 사용할 수 없어도 현재 세션에서 유지됩니다.
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    setDatabaseBackupStatus(null);
    setDatabaseDataSourceStatus('loading');
    setDatabaseStatusMessage('연결 중');

    loadAdminDatabaseStatus(databaseEnvironment)
      .then((databaseStatus) => {
        if (!isMounted) return;
        setDatabaseBackupStatus(databaseStatus);
        setDatabaseDataSourceStatus('firebase');
        setDatabaseStatusMessage('연결');
      })
      .catch(() => {
        if (!isMounted) return;
        setDatabaseDataSourceStatus('error');
        setDatabaseStatusMessage('연결 실패');
      });

    return () => {
      isMounted = false;
    };
  }, [databaseEnvironment, isAuthenticated]);

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
            <span>{databaseEnvironment === 'development' ? '개발 콘솔' : '운영 콘솔'}</span>
          </div>
        </div>

        <nav className="navList" aria-label="관리자 메뉴">
          <section className="navGroup" aria-label="개요">
            <p className="navGroupLabel">개요</p>
            <button
              className={page === 'dashboard' ? 'active' : ''}
              type="button"
              onClick={() => setPage('dashboard')}
            >
              <span className="navIcon"><Database size={18} /></span>
              <span>대시보드</span>
            </button>
          </section>

          <section className="navGroup" aria-label="운영 관리">
            <p className="navGroupLabel">운영 관리</p>
            <button
              className={page === 'versions' ? 'active' : ''}
              type="button"
              onClick={() => setPage('versions')}
            >
              <span className="navIcon"><FileText size={18} /></span>
              <span>버전 노트</span>
            </button>
            <button
              className={page === 'support' ? 'active' : ''}
              type="button"
              onClick={() => setPage('support')}
            >
              <span className="navIcon"><Inbox size={18} /></span>
              <span>1:1 문의</span>
              {waitingInquiryCount > 0 ? (
                <span className="navCount">{waitingInquiryCount}</span>
              ) : null}
            </button>
          </section>

          <section className="navGroup navGroupSystem" aria-label="시스템">
            <p className="navGroupLabel">시스템</p>
            <button
              className={page === 'database' ? 'active' : ''}
              type="button"
              onClick={() => setPage('database')}
            >
              <span className="navIcon"><RotateCw size={18} /></span>
              <span>DB 현황</span>
            </button>
          </section>
        </nav>
      </aside>

      <main className="mainArea">
        <header className="topBar" id="dashboard">
          <div>
            <h1>{pageTitle[page]}</h1>
          </div>
          <button
            className="logoutButton"
            type="button"
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            로그아웃
          </button>
        </header>

        {page === 'dashboard' ? (
          <DashboardPage
            activePocketCount={activePocketCount}
            dataSourceStatus={dataSourceStatus}
            environment={databaseEnvironment}
            firebaseStatusMessage={firebaseStatusMessage}
            onLoadPocketMembers={loadAdminPocketMembers}
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
            environment={databaseEnvironment}
            firebaseStatusMessage={databaseStatusMessage}
            onEnvironmentChange={handleDatabaseEnvironmentChange}
          />
        ) : null}

        {page === 'versions' ? (
          <VersionNotesPage
            environment={databaseEnvironment}
            notes={versionNotes}
            onChangeNotes={setVersionNotes}
            onDeleteNote={(note) => deleteAdminVersionNote(note.id, databaseEnvironment)}
            onSaveNote={(note) => saveAdminVersionNote(note, databaseEnvironment)}
            onSelectNote={setSelectedVersionId}
            selectedNote={selectedVersion}
          />
        ) : null}

        {page === 'support' ? (
          <SupportPage
            inquiries={supportInquiries}
            onAnswerInquiry={async (inquiry, answer) => {
              await answerSupportInquiryRemote(inquiry, answer, databaseEnvironment);
              setSupportInquiries((currentInquiries) =>
                currentInquiries.filter((item) => item.id !== inquiry.id),
              );
            }}
            waitingCount={waitingInquiryCount}
          />
        ) : null}
      </main>
      {isLogoutDialogOpen ? (
        <div className="logoutConfirmBackdrop" role="presentation">
          <section
            aria-labelledby="logout-confirm-title"
            aria-modal="true"
            className="logoutConfirmDialog"
            role="dialog"
          >
            <h2 id="logout-confirm-title">로그아웃할까요?</h2>
            <p>로그아웃하면 다시 로그인해야 해요.</p>
            <div className="logoutConfirmActions">
              <button type="button" onClick={() => setIsLogoutDialogOpen(false)}>
                취소
              </button>
              <button type="button" onClick={logoutAdmin}>
                로그아웃
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type DashboardPageProps = {
  activePocketCount: number;
  dataSourceStatus: DataSourceStatus;
  environment: DatabaseEnvironment;
  firebaseStatusMessage: string;
  onLoadPocketMembers: (
    pocketId: string,
    environment: DatabaseEnvironment,
  ) => Promise<AdminPocketMember[]>;
  pendingDeletionPocketCount: number;
  pockets: AdminPocket[];
  pocketWeeklyDelta: number;
  userWeeklyDelta: number;
  users: AdminUser[];
};

function DashboardPage({
  activePocketCount,
  dataSourceStatus,
  environment,
  firebaseStatusMessage,
  onLoadPocketMembers,
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
  const [selectedPocket, setSelectedPocket] = useState<AdminPocket | null>(null);
  const [pocketMembers, setPocketMembers] = useState<AdminPocketMember[]>([]);
  const [isLoadingPocketMembers, setIsLoadingPocketMembers] = useState(false);
  const [pocketMembersError, setPocketMembersError] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();

    return users
      .filter((user) => {
        if (!normalizedQuery) {
          return true;
        }

        return [user.displayName, user.email, user.id]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => right.joinedAt.localeCompare(left.joinedAt));
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

  async function openPocketMembers(pocket: AdminPocket) {
    setSelectedPocket(pocket);
    setPocketMembers([]);
    setPocketMembersError('');
    setIsLoadingPocketMembers(true);

    try {
      setPocketMembers(await onLoadPocketMembers(pocket.id, environment));
    } catch {
      setPocketMembersError('참여자 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingPocketMembers(false);
    }
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
                  <tr
                    aria-label={`${pocketItem.name} 참여자 보기`}
                    className="pocketMemberRow"
                    key={pocketItem.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPocketMembers(pocketItem)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openPocketMembers(pocketItem);
                      }
                    }}
                  >
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

      {selectedPocket ? (
        <div className="pocketMembersBackdrop" role="presentation">
          <section
            aria-labelledby="pocket-members-title"
            aria-modal="true"
            className="pocketMembersDialog"
            role="dialog"
          >
            <div className="panelHeader compact">
              <div>
                <p className="eyebrow">Members</p>
                <h2 id="pocket-members-title">{selectedPocket.name} 참여자</h2>
              </div>
              <button
                className="pocketMembersClose"
                type="button"
                onClick={() => setSelectedPocket(null)}
              >
                닫기
              </button>
            </div>
            <div className="pocketMembersContent">
              {isLoadingPocketMembers ? <p>참여자 목록을 불러오는 중이에요.</p> : null}
              {pocketMembersError ? <p className="pocketMembersError">{pocketMembersError}</p> : null}
              {!isLoadingPocketMembers && !pocketMembersError ? (
                <div className="pocketMembersList">
                  {pocketMembers.map((member) => (
                    <div className="pocketMemberItem" key={member.id}>
                      <UserAvatar
                        displayName={member.displayName}
                        photoURL={member.photoURL}
                      />
                      <div>
                        <strong>{member.displayName}</strong>
                        <span>{member.statusMessage || '상태 메시지가 없어요.'}</span>
                      </div>
                      <small>{member.joinedAt} 참여</small>
                    </div>
                  ))}
                  {pocketMembers.length === 0 ? <p>참여자가 없어요.</p> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

type DatabaseStatusPageProps = {
  databaseBackupStatus: DatabaseBackupStatus | null;
  dataSourceStatus: DataSourceStatus;
  environment: DatabaseEnvironment;
  firebaseStatusMessage: string;
  onEnvironmentChange: (environment: DatabaseEnvironment) => void;
};

function DatabaseStatusPage({
  databaseBackupStatus,
  dataSourceStatus,
  environment,
  firebaseStatusMessage,
  onEnvironmentChange,
}: DatabaseStatusPageProps) {
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreBackup, setRestoreBackup] = useState<DatabaseBackup | null>(null);
  const [restoreDatabaseId, setRestoreDatabaseId] = useState('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreSecondConfirm, setRestoreSecondConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEnvironmentMenuOpen, setIsEnvironmentMenuOpen] = useState(false);

  const environmentLabel = environment === 'production' ? '운영' : '개발';

  function selectEnvironment(nextEnvironment: DatabaseEnvironment) {
    setIsEnvironmentMenuOpen(false);
    onEnvironmentChange(nextEnvironment);
  }

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
        environment,
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
            <h2>{environmentLabel} DB 현황</h2>
          </div>
          <div className="databaseHeaderActions">
            <div className="databaseEnvironmentSelect">
              <button
                aria-controls="database-environment-menu"
                aria-expanded={isEnvironmentMenuOpen}
                className="databaseEnvironmentTrigger"
                type="button"
                onClick={() => setIsEnvironmentMenuOpen((isOpen) => !isOpen)}
              >
                <span>{environmentLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={isEnvironmentMenuOpen ? 'open' : ''}
                  size={16}
                />
              </button>
              {isEnvironmentMenuOpen ? (
                <div
                  aria-label="DB 환경 선택"
                  className="databaseEnvironmentMenu"
                  id="database-environment-menu"
                  role="menu"
                >
                  {(['production', 'development'] as const).map((option) => {
                    const label = option === 'production' ? '운영' : '개발';
                    const isSelected = option === environment;

                    return (
                      <button
                        aria-checked={isSelected}
                        className={isSelected ? 'selected' : ''}
                        key={option}
                        role="menuitemradio"
                        type="button"
                        onClick={() => selectEnvironment(option)}
                      >
                        <span>{label}</span>
                        {isSelected ? <Check aria-hidden="true" size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <span className={`dataSourcePill ${dataSourceStatus}`}>
              <i aria-hidden="true" />
              {firebaseStatusMessage}
            </span>
          </div>
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
                복원하고 확인한 뒤 {environmentLabel} 환경에서 검증하는 것입니다.
              </p>
              <small>
                백업 복원은 {environmentLabel} DB를 바로 덮어쓰지 않고 선택한 백업 시점의
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
            {environmentLabel} Firebase DB 현황을 불러오는 중이에요.
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
                이 작업은 {environmentLabel} DB를 즉시 되돌리지 않습니다. 선택한 백업 시점의
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
  environment: DatabaseEnvironment;
  notes: VersionNote[];
  onChangeNotes: (notes: VersionNote[]) => void;
  onDeleteNote: (note: VersionNote) => Promise<void> | void;
  onSaveNote: (note: VersionNote) => Promise<void> | void;
  onSelectNote: (id: string) => void;
  selectedNote: VersionNote | null;
};

function VersionNotesPage({
  environment,
  notes,
  onChangeNotes,
  onDeleteNote,
  onSaveNote,
  onSelectNote,
  selectedNote,
}: VersionNotesPageProps) {
  const [saveMessage, setSaveMessage] = useState('');
  const [savedVersionNote, setSavedVersionNote] = useState<VersionNote | null>(null);
  const [notePendingDeletion, setNotePendingDeletion] = useState<VersionNote | null>(null);
  const [isDeletingVersionNote, setIsDeletingVersionNote] = useState(false);
  const [isSavingVersionNote, setIsSavingVersionNote] = useState(false);
  const environmentLabel = environment === 'production' ? '운영' : '개발';

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
      releaseType: notes.length === 0 ? 'major' : 'patch',
      status: 'draft',
    };

    setSaveMessage(`${version} 새 노트 생성`);
    onChangeNotes([newNote, ...notes]);
    onSelectNote(newNote.id);
  }

  async function saveVersionNote() {
    if (!selectedNote || isSavingVersionNote) {
      return;
    }

    const releaseType = detectReleaseType(selectedNote.version, notes, selectedNote.id);
    const noteToSave = {
      ...selectedNote,
      releaseType,
      status: 'published' as const,
    };

    try {
      setIsSavingVersionNote(true);
      await onSaveNote(noteToSave);
      onChangeNotes(
        notes
          .map((note) => (note.id === selectedNote.id ? noteToSave : note))
          .sort(compareVersionNotes),
      );
      setSaveMessage(`${selectedNote.version} 저장 완료 · ${releaseTypeLabel[releaseType]}`);
      setSavedVersionNote(noteToSave);
    } catch {
      setSaveMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSavingVersionNote(false);
    }
  }

  function requestVersionNoteDeletion() {
    if (!selectedNote || isDeletingVersionNote || isSavingVersionNote) {
      return;
    }

    setNotePendingDeletion(selectedNote);
  }

  async function deleteVersionNote() {
    if (!notePendingDeletion || isDeletingVersionNote || isSavingVersionNote) {
      return;
    }

    try {
      setIsDeletingVersionNote(true);
      await onDeleteNote(notePendingDeletion);
      const remainingNotes = notes.filter((note) => note.id !== notePendingDeletion.id);
      onChangeNotes(remainingNotes);
      onSelectNote(remainingNotes[0]?.id ?? '');
      setNotePendingDeletion(null);
      setSaveMessage('버전 노트를 삭제했어요.');
    } catch {
      setSaveMessage('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeletingVersionNote(false);
    }
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
            <h2>{environmentLabel} 이전 버전 노트</h2>
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
            <button
              disabled={isSavingVersionNote || isDeletingVersionNote}
              type="button"
              onClick={saveVersionNote}
            >
              {isSavingVersionNote ? '저장 중' : '저장'}
            </button>
            <button
              className="versionDeleteButton"
              disabled={isSavingVersionNote || isDeletingVersionNote}
              type="button"
              onClick={requestVersionNoteDeletion}
            >
              {isDeletingVersionNote ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">삭제 중</span>
                  </>
                ) : (
                  '삭제'
                )}
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
      {savedVersionNote ? (
        <div className="versionSaveBackdrop" role="presentation">
          <section
            aria-labelledby="version-save-title"
            aria-modal="true"
            className="versionSaveDialog"
            role="dialog"
          >
            <p className="eyebrow">Saved</p>
            <h2 id="version-save-title">버전 노트를 저장했어요</h2>
            <p>
              {savedVersionNote.version} · {releaseTypeLabel[savedVersionNote.releaseType]}
            </p>
            <button type="button" onClick={() => setSavedVersionNote(null)}>
              확인
            </button>
          </section>
        </div>
      ) : null}
      {notePendingDeletion ? (
        <div className="versionSaveBackdrop" role="presentation">
          <section
            aria-labelledby="version-delete-title"
            aria-modal="true"
            className="versionSaveDialog versionDeleteDialog"
            role="dialog"
          >
            <h2 id="version-delete-title">버전 노트를 삭제할까요?</h2>
            <p>{notePendingDeletion.version} 버전 노트가 삭제됩니다.</p>
            <div className="versionDeleteDialogActions">
              <button
                disabled={isDeletingVersionNote}
                type="button"
                onClick={() => setNotePendingDeletion(null)}
              >
                취소
              </button>
              <button
                disabled={isDeletingVersionNote}
                type="button"
                onClick={deleteVersionNote}
              >
                {isDeletingVersionNote ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">삭제 중</span>
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
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
  const [isAnswerConfirmOpen, setIsAnswerConfirmOpen] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  useEffect(() => {
    setAnswerText(selectedInquiry?.answer ?? '');
  }, [selectedInquiry?.answer, selectedInquiry?.id]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInquiry || !answerText.trim()) {
      return;
    }

    setIsAnswerConfirmOpen(true);
  }

  async function confirmAnswer() {
    if (!selectedInquiry || !answerText.trim() || isSubmittingAnswer) {
      return;
    }

    try {
      setIsSubmittingAnswer(true);
      await onAnswerInquiry(selectedInquiry, answerText.trim());
      setIsAnswerConfirmOpen(false);
    } finally {
      setIsSubmittingAnswer(false);
    }
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
      {isAnswerConfirmOpen && selectedInquiry ? (
        <div className="supportAnswerBackdrop" role="presentation">
          <section
            aria-labelledby="support-answer-confirm-title"
            aria-modal="true"
            className="supportAnswerDialog"
            role="dialog"
          >
            <h2 id="support-answer-confirm-title">답변을 완료할까요?</h2>
            <p>{selectedInquiry.userName}님에게 답변이 전달됩니다.</p>
            <div className="supportAnswerDialogActions">
              <button
                disabled={isSubmittingAnswer}
                type="button"
                onClick={() => setIsAnswerConfirmOpen(false)}
              >
                취소
              </button>
              <button disabled={isSubmittingAnswer} type="button" onClick={confirmAnswer}>
                {isSubmittingAnswer ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="buttonSpinner" size={18} />
                    <span className="srOnly">답변 저장 중</span>
                  </>
                ) : (
                  '답변 완료'
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
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
    return 'major';
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
