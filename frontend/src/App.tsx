import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { castVote, createAdminPoll, fetchAdminPolls, fetchPollDetails, fetchOpenPolls, fetchPollResults, transitionAdminPoll, type AdminCredentials, type AdminPollInput, type PollOption, type PollResults, type PollStatus } from './pollApi'

const statusLabel: Record<PollStatus, string> = {
  SCHEDULED: '시작 예정', OPEN: '진행 중', PAUSED: '일시정지', CLOSED: '마감',
}

const formatDateTime = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000))
  return <>{[Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(' : ')}</>
}

function Logo() {
  return <div className="logo" aria-label="TOP"><span>T</span><b>O</b><span>P</span></div>
}

function PageStatus({ children }: { children: React.ReactNode }) {
  return <div className="page-state" role="status">{children}</div>
}

function PollListPage() {
  const pollsQuery = useQuery({ queryKey: ['polls'], queryFn: fetchOpenPolls })
  return <main className="page list-page">
    <section className="list-hero">
      <span className="live-pill">TODAY'S POLLS</span>
      <h1>오늘, 당신의 생각을<br /><em>한 표로 보여주세요.</em></h1>
      <p>관심 있는 주제를 골라 지금 바로 참여해 보세요.</p>
    </section>
    <section aria-labelledby="poll-list-title">
      <div className="section-head"><div><h2 id="poll-list-title">진행 중인 투표 <b>{pollsQuery.data?.length ?? 0}</b></h2><p>카드를 선택해 후보를 확인하세요.</p></div></div>
      {pollsQuery.isPending && <PageStatus>투표 목록을 불러오는 중입니다.</PageStatus>}
      {pollsQuery.isError && <PageStatus>{pollsQuery.error.message}</PageStatus>}
      {pollsQuery.data?.length === 0 && <PageStatus>현재 진행 중인 투표가 없습니다.</PageStatus>}
      <div className="poll-grid">
        {pollsQuery.data?.map((poll) => <Link className="poll-card" to={`/polls/${poll.pollId}`} key={poll.pollId}>
          <div className="card-top"><span className={`status ${poll.status.toLowerCase()}`}>{statusLabel[poll.status]}</span><span>{poll.type}</span></div>
          <h3>{poll.title}</h3>
          <p>{formatDateTime(poll.startsAt)}<br />— {formatDateTime(poll.endsAt)}</p>
          <strong>후보 보기 <span aria-hidden="true">→</span></strong>
        </Link>)}
      </div>
    </section>
  </main>
}

function CandidateCard({ option, rank, selected, disabled, onVote }: {
  option: PollOption; rank: number; selected: boolean; disabled: boolean; onVote: () => void
}) {
  const card = <article className={`candidate-card${selected ? ' selected' : ''}`}>
    <div className="portrait">
      <span aria-hidden="true">{option.name.charAt(0)}</span>
      {option.imageUrl && <img src={option.imageUrl} alt="" loading="lazy" />}
      <span className={`rank-ribbon rank-${rank}`}>{rank}</span>
      {selected && <span className="picked">✓ 내 투표</span>}
    </div>
    <div className="candidate-body">
      <h3>{option.name}</h3>
      {option.team && <p>{option.team}</p>}
      <button type="button" onClick={onVote} disabled={disabled} aria-pressed={selected}>{selected ? '내 투표 · 변경' : '투표하기'}</button>
    </div>
  </article>
  return <div className="candidate-outer-card">{card}</div>
}

function RankingsPanel({ options, data }: { options: PollOption[]; data?: PollResults }) {
  const rows = data?.results?.map((result) => ({ ...result, option: options.find((option) => option.optionId === result.optionId)! })) ?? []
  const hidden = data?.phase === 'RESULTS_HIDDEN'
  return <section className="panel rankings-panel">
      <div className="section-head"><div><h2>현재 랭킹 TOP 3</h2><p>{rows.length ? 'SSE로 갱신되는 상위 3명입니다.' : '투표 완료자에게 공개'}</p></div><span className="counter-pill">{rows.length ? '실시간' : '잠금'}</span></div>
      {rows.length ? <div className="rank-list">{rows.slice(0, 3).map(({ option, voteCount }, index) => <article className={`rank-card${index === 0 ? ' first' : ''}`} key={option.optionId}>
        {option.imageUrl && <img className="rank-photo" src={option.imageUrl} alt="" />}<div><b className="rank-no">{index === 0 && '👑 '}{index + 1}위</b><strong className="rank-name">{option.name}</strong><span>{option.team}</span><small>{voteCount.toLocaleString()}표</small></div>
      </article>)}</div> : <div className="result-empty"><div><strong>{hidden ? '집계 중입니다' : '순위 집계 비공개'}</strong><p>{hidden ? '마감 후 최종 결과를 확인할 수 있습니다.' : '투표 후 확인할 수 있습니다.'}</p></div></div>}
  </section>
}

function ResultsSidebar({ options, data }: { options: PollOption[]; data?: PollResults }) {
  const rows = data?.results?.map((result) => ({ ...result, option: options.find((option) => option.optionId === result.optionId)! })) ?? []
  const hidden = data?.phase === 'RESULTS_HIDDEN'
  return <aside className="side-col" aria-label="투표 결과">
    <section className="panel side-card">
      <div className="section-head"><div><h3>실시간 투표 현황</h3><p>투표 완료 후 확인 가능</p></div></div>
      {rows.length ? <div className="result-list">{rows.map(({ option, voteCount, percentage }, index) => <div className="result-total" key={option.optionId}>
        <b className="result-rank">{index + 1}</b>{option.imageUrl && <img className="mini-photo" src={option.imageUrl} alt="" />}<div className="result-main"><span><strong>{option.name}</strong><b>{percentage}% · {voteCount.toLocaleString()}표</b></span><i><span style={{ width: `${Math.max(percentage, 7)}%` }} /></i></div>
      </div>)}</div> : <div className="result-empty"><div><strong>{hidden ? '마감 30분 전 집계 비공개' : '투표 후 확인 가능'}</strong><p>아직 공개된 결과가 없습니다.</p></div></div>}
    </section>
    <div className="policy-outer-card"><section className="panel side-card policy-card">
      <div className="section-head"><h3>마감 정책</h3></div>
      <div className="policy-list"><p><b>T-30</b>부터 숫자 결과를 전송하지 않습니다.</p><p><b>재투표</b>는 한 트랜잭션으로 처리합니다.</p><p><b>마감 후</b> 투표를 차단하고 최종 결과를 공개합니다.</p></div>
    </section></div>
  </aside>
}

function PollDetailPage() {
  const { pollId = '' } = useParams()
  const queryClient = useQueryClient()
  const [sortOrder, setSortOrder] = useState<'rank' | 'name'>('rank')
  const [selectedOptionId, setSelectedOptionId] = useState<number>()
  const pollQuery = useQuery({ queryKey: ['poll', pollId], queryFn: () => fetchPollDetails(pollId), enabled: Boolean(pollId), refetchInterval: 5000 })
  const resultsQuery = useQuery({ queryKey: ['poll-results', pollId], queryFn: () => fetchPollResults(pollId), enabled: Boolean(pollId), refetchInterval: 5000 })
  useEffect(() => {
    if (!pollId) return
    const stream = new EventSource(`/api/polls/${pollId}/stream`)
    stream.addEventListener('vote-result', () => queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] }))
    stream.addEventListener('phase-changed', () => queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] }))
    return () => stream.close()
  }, [pollId, queryClient])
  const voteMutation = useMutation({
    mutationFn: (optionId: number) => castVote(pollId, optionId),
    onSuccess: ({ optionId }) => {
      setSelectedOptionId(optionId)
      queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] })
    },
  })

  if (pollQuery.isPending) return <main className="page"><PageStatus>투표를 불러오는 중입니다.</PageStatus></main>
  if (pollQuery.isError) return <main className="page"><PageStatus>{pollQuery.error.message}</PageStatus></main>

  const rankByOptionId = new Map((resultsQuery.data?.results ?? pollQuery.data.options).map((item, index) => [item.optionId, index + 1]))
  const options = [...pollQuery.data.options].sort((a, b) => sortOrder === 'name' ? a.name.localeCompare(b.name, 'ko') : rankByOptionId.get(a.optionId)! - rankByOptionId.get(b.optionId)!)
  const isVotingOpen = pollQuery.data.phase === 'LIVE_VISIBLE' || pollQuery.data.phase === 'RESULTS_HIDDEN'
  const noticeTitle = voteMutation.isSuccess ? '내 투표가 저장되었습니다.' : '투표 전에는 집계 결과를 공개하지 않습니다.'
  const noticeText = voteMutation.isError ? voteMutation.error.message : voteMutation.isSuccess ? '마감 전까지 다른 후보로 재투표할 수 있습니다.' : '후보를 선택하면 서버 저장 성공 후 결과 영역이 열립니다.'

  return <main className="page">
    <Link className="back-link" to="/">← 투표 목록</Link>
    <div className="detail-layout"><div className="main-col"><section className="poll-hero">
      <div className="hero-photo">{pollQuery.data.options[0]?.imageUrl && <img src={pollQuery.data.options[0].imageUrl} alt="투표 대표 이미지" />}</div>
      <div className="hero-copy">
        <div className="campaign"><span className={`live-pill ${pollQuery.data.status.toLowerCase()}`}>{statusLabel[pollQuery.data.status]}</span><span>제 3회 TOP 글로벌 인기 투표</span></div>
        <h1>오늘, 당신의 한 표가<br /><em>최애의 순간</em>을<br />더 빛나게 합니다.</h1>
        <p>TOP과 함께, 더 반짝이는 오늘의 선택을 만들어주세요.</p>
      </div>
      <div className="scribble" aria-hidden="true">More<br />Brighter<br />Tomorrow</div>
      <div className="hero-status">
        <div><span className="status-label">투표 종료까지</span><strong className="countdown"><Countdown endsAt={pollQuery.data.endsAt} /></strong><div className="time-units"><span>시간</span><span>분</span><span>초</span></div></div>
        <div className="metric-line"><span className="metric-icon">♙</span><div className="metric-copy"><span>지금까지의 참여자</span><strong>{(resultsQuery.data?.participantCount ?? 0).toLocaleString()}명</strong></div></div>
        <div className="hero-note">{resultsQuery.data?.voted ? '재투표 직후 실시간 집계에 반영됩니다.' : '투표 완료 후 실시간 순위와 득표율을 확인할 수 있습니다.'}</div>
        <div className="hero-note">한 명을 선택하면 즉시 투표가 저장됩니다.</div>
      </div>
    </section>
    <div className="notice" role="status"><span>✓</span><div><strong>{noticeTitle}</strong><p>{noticeText}</p></div></div>
    <RankingsPanel options={pollQuery.data.options} data={resultsQuery.data} />
    <section className="panel members" aria-labelledby="candidate-title">
      <div className="section-head">
        <div><h2 id="candidate-title">참여 멤버 <b>{options.length}</b></h2><p>당신의 마음을 움직인 한 명에게 투표하세요.</p></div>
        <select className="sort-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'rank' | 'name')} aria-label="후보 정렬"><option value="rank">최근 인기순</option><option value="name">이름순</option></select>
      </div>
      {options.length === 0 ? <PageStatus>등록된 후보가 없습니다.</PageStatus> : <div className="candidate-grid">{options.map((option) => <CandidateCard key={option.optionId} option={option} rank={rankByOptionId.get(option.optionId)!} selected={selectedOptionId === option.optionId} disabled={!isVotingOpen || voteMutation.isPending} onVote={() => voteMutation.mutate(option.optionId)} />)}</div>}
    </section></div><ResultsSidebar options={pollQuery.data.options} data={resultsQuery.data} /></div>
  </main>
}

function AdminPage() {
  const queryClient = useQueryClient()
  const [credentials, setCredentials] = useState<AdminCredentials>()
  const [login, setLogin] = useState({ username: '', password: '' })
  const [showCreate, setShowCreate] = useState(false)
  const pollsQuery = useQuery({ queryKey: ['admin-polls', credentials?.username], queryFn: () => fetchAdminPolls(credentials!), enabled: Boolean(credentials), retry: false })
  const transition = useMutation({
    mutationFn: ({ pollId, action }: { pollId: number; action: 'start' | 'pause' | 'resume' | 'close' }) => transitionAdminPoll(credentials!, pollId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-polls'] }),
  })
  const create = useMutation({
    mutationFn: (input: AdminPollInput) => createAdminPoll(credentials!, input),
    onSuccess: () => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['admin-polls'] }) },
  })

  if (!credentials || pollsQuery.isError) return <main className="page admin-login"><form className="login-card" onSubmit={(event) => { event.preventDefault(); setCredentials(login) }}>
    <span className="live-pill">ADMIN</span><h1>관리자 입장</h1><p>투표를 생성하고 운영 상태를 관리합니다.</p>
    <label>아이디<input required autoComplete="username" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} /></label>
    <label>비밀번호<input required type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
    {pollsQuery.isError && <p className="form-error">{pollsQuery.error.message}</p>}<button type="submit">관리자 입장</button>
  </form></main>

  const polls = pollsQuery.data?.content ?? []
  const actionFor = (status: PollStatus) => status === 'SCHEDULED' ? 'start' : status === 'PAUSED' ? 'resume' : status === 'OPEN' ? 'pause' : undefined
  return <main className="page admin-page">
    <section className="admin-head"><div><span className="live-pill">ADMIN CONSOLE</span><h1>내가 만든 투표</h1><p>투표 생성과 개시·일시정지·재개·마감을 관리합니다.</p></div><button className="admin-primary" type="button" onClick={() => setShowCreate(!showCreate)}>+ 새 투표 만들기</button></section>
    {showCreate && <AdminCreateForm pending={create.isPending} onSubmit={(input) => create.mutate(input)} />}
    <section className="admin-stats"><div><span>전체 투표</span><strong>{pollsQuery.data?.totalElements ?? 0}</strong></div><div><span>진행 중</span><strong>{polls.filter((poll) => poll.status === 'OPEN').length}</strong></div><div><span>전체 참여</span><strong>{polls.reduce((sum, poll) => sum + poll.participantCount, 0).toLocaleString()}</strong></div></section>
    <section className="admin-table-card"><div className="section-head"><div><h2>투표 운영 현황</h2><p>상태 변경은 서버에서 권한·현재 상태·시간을 다시 검증합니다.</p></div></div>
      {pollsQuery.isPending ? <PageStatus>관리자 투표를 불러오는 중입니다.</PageStatus> : <div className="admin-table-wrap"><table><thead><tr><th>투표명</th><th>상태</th><th>참여</th><th>마감</th><th>운영</th></tr></thead><tbody>{polls.map((poll) => { const action = actionFor(poll.status); return <tr key={poll.pollId}><td><strong>{poll.title}</strong></td><td><span className={`status ${poll.status.toLowerCase()}`}>{statusLabel[poll.status]}</span></td><td>{poll.participantCount.toLocaleString()}</td><td>{formatDateTime(poll.endsAt)}</td><td><div className="admin-actions">{action && <button type="button" onClick={() => transition.mutate({ pollId: poll.pollId, action })}>{action === 'start' ? '개시' : action === 'resume' ? '재개' : '일시정지'}</button>}{poll.status !== 'CLOSED' && <button className="danger" type="button" onClick={() => transition.mutate({ pollId: poll.pollId, action: 'close' })}>마감</button>}</div></td></tr> })}</tbody></table></div>}
    </section>
  </main>
}

function AdminCreateForm({ pending, onSubmit }: { pending: boolean; onSubmit: (input: AdminPollInput) => void }) {
  const [title, setTitle] = useState('')
  const [candidates, setCandidates] = useState('')
  return <form className="admin-create" onSubmit={(event) => {
    event.preventDefault()
    const now = Date.now()
    const options = candidates.split('\n').filter(Boolean).map((line) => { const [name, team, imageUrl] = line.split('|').map((value) => value.trim()); return { name, team, imageUrl } })
    onSubmit({ title, description: '', pollType: 'SINGLE', maxSelections: 1, startsAt: new Date(now + 60_000).toISOString(), endsAt: new Date(now + 86_400_000).toISOString(), options })
  }}><h2>새 투표 만들기</h2><label>투표 제목<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>후보 목록<textarea required placeholder="이름 | 팀 · 포지션 | 이미지 URL" value={candidates} onChange={(event) => setCandidates(event.target.value)} /></label><button disabled={pending} type="submit">{pending ? '저장 중' : '예약 투표 저장'}</button></form>
}

function App() {
  return <><header className="site-header"><div className="header-inner"><Link className="brand" to="/"><Logo /><span><strong>Today's Opinion &amp; Poll</strong><small>Make your choice brighter</small></span></Link><nav aria-label="주요 메뉴"><Link to="/">진행 중 투표</Link></nav><Link className="admin-entry" to="/admin">관리자 입장</Link></div></header><Routes><Route path="/" element={<PollListPage />} /><Route path="/polls/:pollId" element={<PollDetailPage />} /><Route path="/admin" element={<AdminPage />} /></Routes></>
}

export default App
