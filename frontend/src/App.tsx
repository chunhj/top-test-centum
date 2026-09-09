import { useQuery } from '@tanstack/react-query'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { getPoll, getPolls, type PollStatus } from './pollApi'

const statusLabel: Record<PollStatus, string> = {
  SCHEDULED: '시작 예정', OPEN: '진행 중', PAUSED: '일시정지', CLOSED: '마감',
}

const dateTime = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

function PageState({ children }: { children: React.ReactNode }) {
  return <div className="page-state" role="status">{children}</div>
}

function PollListPage() {
  const polls = useQuery({ queryKey: ['polls'], queryFn: getPolls })

  return <main className="page">
    <section className="hero">
      <span className="eyebrow"><i /> TODAY'S POLLS</span>
      <h1>지금 진행 중인 투표</h1>
      <p>관심 있는 주제를 선택해 후보를 확인하세요.</p>
    </section>
    <section aria-labelledby="poll-list-title">
      <div className="section-title"><h2 id="poll-list-title">투표 목록</h2>{polls.data && <span>{polls.data.length}개</span>}</div>
      {polls.isPending && <PageState>투표 목록을 불러오는 중입니다.</PageState>}
      {polls.isError && <PageState>{polls.error.message}</PageState>}
      {polls.data?.length === 0 && <PageState>현재 진행 중인 투표가 없습니다.</PageState>}
      <div className="poll-grid">
        {polls.data?.map((poll) => <Link className="poll-card" to={`/polls/${poll.pollId}`} key={poll.pollId}>
          <div className="card-top"><span className={`status ${poll.status.toLowerCase()}`}>{statusLabel[poll.status]}</span><span>{poll.type}</span></div>
          <h3>{poll.title}</h3>
          <p>{dateTime(poll.startsAt)} – {dateTime(poll.endsAt)}</p>
          <strong>후보 보기 <span aria-hidden="true">→</span></strong>
        </Link>)}
      </div>
    </section>
  </main>
}

function PollDetailPage() {
  const { pollId = '' } = useParams()
  const poll = useQuery({ queryKey: ['poll', pollId], queryFn: () => getPoll(pollId), enabled: Boolean(pollId) })

  if (poll.isPending) return <main className="page"><PageState>투표를 불러오는 중입니다.</PageState></main>
  if (poll.isError) return <main className="page"><PageState>{poll.error.message}</PageState></main>

  return <main className="page">
    <Link className="back-link" to="/">← 투표 목록</Link>
    <section className="detail-hero">
      <span className="eyebrow"><i /> {statusLabel[poll.data.status]}</span>
      <h1>{poll.data.title}</h1>
      {poll.data.description && <p>{poll.data.description}</p>}
      <div className="badges"><span>{poll.data.type}</span><span>최대 {poll.data.maxSelections}개 선택</span><span>{dateTime(poll.data.endsAt)} 마감</span></div>
    </section>
    <section className="candidate-section" aria-labelledby="candidate-title">
      <div className="section-title"><div><h2 id="candidate-title">투표 대상</h2><p>후보를 확인해 보세요.</p></div><span>{poll.data.options.length}명</span></div>
      {poll.data.options.length === 0 ? <PageState>등록된 후보가 없습니다.</PageState> : <div className="candidate-grid">
        {poll.data.options.map((option) => <article className="candidate-card" key={option.optionId}>
          <div className="portrait"><span aria-hidden="true">{option.name.charAt(0)}</span>{option.imageUrl && <img src={option.imageUrl} alt="" loading="lazy" />}</div>
          <div className="candidate-body"><h3>{option.name}</h3>{option.team && <p>{option.team}</p>}</div>
        </article>)}
      </div>}
    </section>
  </main>
}

function App() {
  return <><header className="app-header"><Link className="brand" to="/" aria-label="TOP 홈"><span>TOP</span><strong>Today's Opinion &amp; Poll</strong></Link></header><Routes><Route path="/" element={<PollListPage />} /><Route path="/polls/:pollId" element={<PollDetailPage />} /></Routes></>
}

export default App
