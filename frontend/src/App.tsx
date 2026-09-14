import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { castVote, getPoll, getPolls, getResults, type PollOption, type PollResults, type PollStatus } from './pollApi'

const statusLabel: Record<PollStatus, string> = {
  SCHEDULED: '시작 예정', OPEN: '진행 중', PAUSED: '일시정지', CLOSED: '마감',
}

const dateTime = (value: string) => new Intl.DateTimeFormat('ko-KR', {
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

function PageState({ children }: { children: React.ReactNode }) {
  return <div className="page-state" role="status">{children}</div>
}

function PollListPage() {
  const polls = useQuery({ queryKey: ['polls'], queryFn: getPolls })
  return <main className="page list-page">
    <section className="list-hero">
      <span className="live-pill">TODAY'S POLLS</span>
      <h1>오늘, 당신의 생각을<br /><em>한 표로 보여주세요.</em></h1>
      <p>관심 있는 주제를 골라 지금 바로 참여해 보세요.</p>
    </section>
    <section aria-labelledby="poll-list-title">
      <div className="section-head"><div><h2 id="poll-list-title">진행 중인 투표 <b>{polls.data?.length ?? 0}</b></h2><p>카드를 선택해 후보를 확인하세요.</p></div></div>
      {polls.isPending && <PageState>투표 목록을 불러오는 중입니다.</PageState>}
      {polls.isError && <PageState>{polls.error.message}</PageState>}
      {polls.data?.length === 0 && <PageState>현재 진행 중인 투표가 없습니다.</PageState>}
      <div className="poll-grid">
        {polls.data?.map((poll) => <Link className="poll-card" to={`/polls/${poll.pollId}`} key={poll.pollId}>
          <div className="card-top"><span className={`status ${poll.status.toLowerCase()}`}>{statusLabel[poll.status]}</span><span>{poll.type}</span></div>
          <h3>{poll.title}</h3>
          <p>{dateTime(poll.startsAt)}<br />— {dateTime(poll.endsAt)}</p>
          <strong>후보 보기 <span aria-hidden="true">→</span></strong>
        </Link>)}
      </div>
    </section>
  </main>
}

function CandidateCard({ option, rank, selected, disabled, onVote }: {
  option: PollOption; rank: number; selected: boolean; disabled: boolean; onVote: () => void
}) {
  return <article className={`candidate-card${selected ? ' selected' : ''}`}>
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
    <section className="panel side-card policy-card">
      <div className="section-head"><h3>마감 정책</h3></div>
      <div className="policy-list"><p><b>T-30</b>부터 숫자 결과를 전송하지 않습니다.</p><p><b>재투표</b>는 한 트랜잭션으로 처리합니다.</p><p><b>마감 후</b> 투표를 차단하고 최종 결과를 공개합니다.</p></div>
    </section>
  </aside>
}

function PollDetailPage() {
  const { pollId = '' } = useParams()
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<'rank' | 'name'>('rank')
  const [selectedOptionId, setSelectedOptionId] = useState<number>()
  const poll = useQuery({ queryKey: ['poll', pollId], queryFn: () => getPoll(pollId), enabled: Boolean(pollId), refetchInterval: 5000 })
  const results = useQuery({ queryKey: ['poll-results', pollId], queryFn: () => getResults(pollId), enabled: Boolean(pollId), refetchInterval: 5000 })
  const vote = useMutation({
    mutationFn: (optionId: number) => castVote(pollId, optionId),
    onSuccess: ({ optionId }) => {
      setSelectedOptionId(optionId)
      queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] })
    },
  })

  if (poll.isPending) return <main className="page"><PageState>투표를 불러오는 중입니다.</PageState></main>
  if (poll.isError) return <main className="page"><PageState>{poll.error.message}</PageState></main>

  const rankByOptionId = new Map((results.data?.results ?? poll.data.options).map((item, index) => [item.optionId, index + 1]))
  const options = [...poll.data.options].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'ko') : rankByOptionId.get(a.optionId)! - rankByOptionId.get(b.optionId)!)
  const votingOpen = poll.data.phase === 'LIVE_VISIBLE' || poll.data.phase === 'RESULTS_HIDDEN'
  const noticeTitle = vote.isSuccess ? '내 투표가 저장되었습니다.' : '투표 전에는 집계 결과를 공개하지 않습니다.'
  const noticeText = vote.isError ? vote.error.message : vote.isSuccess ? '마감 전까지 다른 후보로 재투표할 수 있습니다.' : '후보를 선택하면 서버 저장 성공 후 결과 영역이 열립니다.'

  return <main className="page">
    <Link className="back-link" to="/">← 투표 목록</Link>
    <div className="detail-layout"><div className="main-col"><section className="poll-hero">
      <div className="hero-photo">{poll.data.options[0]?.imageUrl && <img src={poll.data.options[0].imageUrl} alt="투표 대표 이미지" />}</div>
      <div className="hero-copy">
        <div className="campaign"><span className={`live-pill ${poll.data.status.toLowerCase()}`}>{statusLabel[poll.data.status]}</span><span>제 3회 TOP 글로벌 인기 투표</span></div>
        <h1>오늘, 당신의 한 표가<br /><em>최애의 순간</em>을<br />더 빛나게 합니다.</h1>
        <p>TOP과 함께, 더 반짝이는 오늘의 선택을 만들어주세요.</p>
      </div>
      <div className="scribble" aria-hidden="true">More<br />Brighter<br />Tomorrow</div>
      <div className="hero-status">
        <div><span className="status-label">투표 종료까지</span><strong className="countdown"><Countdown endsAt={poll.data.endsAt} /></strong><div className="time-units"><span>시간</span><span>분</span><span>초</span></div></div>
        <div className="metric-line"><span className="metric-icon">♙</span><div className="metric-copy"><span>지금까지의 참여자</span><strong>{(results.data?.participantCount ?? 0).toLocaleString()}명</strong></div></div>
        <div className="hero-note">{results.data?.voted ? '재투표 직후 실시간 집계에 반영됩니다.' : '투표 완료 후 실시간 순위와 득표율을 확인할 수 있습니다.'}</div>
        <div className="hero-note">한 명을 선택하면 즉시 투표가 저장됩니다.</div>
      </div>
    </section>
    <div className="notice" role="status"><span>✓</span><div><strong>{noticeTitle}</strong><p>{noticeText}</p></div></div>
    <RankingsPanel options={poll.data.options} data={results.data} />
    <section className="panel members" aria-labelledby="candidate-title">
      <div className="section-head">
        <div><h2 id="candidate-title">참여 멤버 <b>{options.length}</b></h2><p>당신의 마음을 움직인 한 명에게 투표하세요.</p></div>
        <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value as 'rank' | 'name')} aria-label="후보 정렬"><option value="rank">최근 인기순</option><option value="name">이름순</option></select>
      </div>
      {options.length === 0 ? <PageState>등록된 후보가 없습니다.</PageState> : <div className="candidate-grid">{options.map((option) => <CandidateCard key={option.optionId} option={option} rank={rankByOptionId.get(option.optionId)!} selected={selectedOptionId === option.optionId} disabled={!votingOpen || vote.isPending} onVote={() => vote.mutate(option.optionId)} />)}</div>}
    </section></div><ResultsSidebar options={poll.data.options} data={results.data} /></div>
  </main>
}

function App() {
  return <><header className="site-header"><div className="header-inner"><Link className="brand" to="/"><Logo /><span><strong>Today's Opinion &amp; Poll</strong><small>Make your choice brighter</small></span></Link><nav aria-label="주요 메뉴"><Link to="/">진행 중 투표</Link></nav><div className="avatar" aria-hidden="true">G</div></div></header><Routes><Route path="/" element={<PollListPage />} /><Route path="/polls/:pollId" element={<PollDetailPage />} /></Routes></>
}

export default App
