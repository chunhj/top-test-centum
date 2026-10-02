import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createIdempotencyKey } from './api/pollApi'

// Core user flows: vote / re-vote, vote failure, SSE handling, admin login and admin errors,
// list status display. fetch and EventSource are replaced with in-memory fakes.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const FUTURE = '2099-01-01T00:00:00Z'

type MockResponse = { status?: number; body?: unknown }
type Handler = (url: string, init?: RequestInit) => MockResponse | undefined

class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  listeners = new Map<string, (event: MessageEvent) => void>()

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(type, listener)
  }

  close() {}

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent)
  }
}

function mockFetch(handler: Handler) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const response = handler(url, init) ?? { status: 404, body: {} }
    const status = response.status ?? 200
    return { ok: status >= 200 && status < 300, status, json: async () => response.body }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderRoute(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><App /></MemoryRouter></QueryClientProvider>)
}

const latestStream = () => MockEventSource.instances[MockEventSource.instances.length - 1]
const headerOf = (init: RequestInit | undefined, name: string) => (init?.headers as Record<string, string> | undefined)?.[name]
// A candidate's name can also appear in the TOP 3 panel and the results sidebar once results are
// public, so pick the occurrence that sits inside a candidate card (<article>).
const cardOf = (name: string) => {
  const card = screen.getAllByText(name).map((element) => element.closest('article')).find((article) => article !== null)
  if (!card) throw new Error(`No candidate card found for ${name}`)
  return card
}

const pollDetail = {
  pollId: 1, title: 'Poll', description: null, type: 'SINGLE', maxSelections: 1, status: 'OPEN', phase: 'LIVE_VISIBLE',
  startsAt: '2026-09-01T00:00:00Z', endsAt: FUTURE,
  options: [
    { optionId: 3, name: '후보 A', imageUrl: null, team: null },
    { optionId: 4, name: '후보 B', imageUrl: null, team: null },
  ],
}
const hiddenResults = { pollId: 1, phase: 'LIVE_VISIBLE', voted: false, participantCount: 0 }
const visibleResults = { pollId: 1, phase: 'LIVE_VISIBLE', voted: true, participantCount: 6, results: [{ optionId: 3, voteCount: 6, percentage: 100 }] }

beforeEach(() => {
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource)
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('voting', () => {
  it('votes, then re-votes for another candidate with a UUID Idempotency-Key each time', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') return { body: hiddenResults }
      if (url === '/api/polls/1/votes' && init?.method === 'POST') {
        return { body: { ballotId: 1, optionId: JSON.parse(String(init.body)).optionId } }
      }
      return undefined
    })
    renderRoute('/polls/1')

    await screen.findByText('후보 A')
    fireEvent.click(within(cardOf('후보 A')).getByRole('button', { name: '투표하기' }))
    expect(await screen.findByText('내 투표가 저장되었습니다.')).toBeTruthy()
    expect(within(cardOf('후보 A')).getByRole('button', { name: '내 투표 · 변경' })).toBeTruthy()

    fireEvent.click(within(cardOf('후보 B')).getByRole('button', { name: '투표하기' }))
    await waitFor(() => expect(within(cardOf('후보 B')).getByRole('button', { name: '내 투표 · 변경' })).toBeTruthy())
    expect(within(cardOf('후보 A')).getByRole('button', { name: '투표하기' })).toBeTruthy()

    const votes = fetchMock.mock.calls.filter(([url]) => url === '/api/polls/1/votes')
    expect(votes.map(([, init]) => JSON.parse(String(init?.body)).optionId)).toEqual([3, 4])
    for (const [, init] of votes) expect(headerOf(init, 'Idempotency-Key')).toMatch(UUID_V4)
  })

  it('shows only the error message (no pre-vote title) when a vote fails', async () => {
    mockFetch((url, init) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') return { body: hiddenResults }
      if (url === '/api/polls/1/votes' && init?.method === 'POST') return { status: 409, body: {} }
      return undefined
    })
    renderRoute('/polls/1')

    await screen.findByText('후보 A')
    fireEvent.click(within(cardOf('후보 A')).getByRole('button', { name: '투표하기' }))
    expect(await screen.findByText('투표를 저장하지 못했습니다.')).toBeTruthy()
    expect(screen.queryByText('투표 전에는 집계 결과를 공개하지 않습니다.')).toBeNull()
    expect(screen.queryByText('내 투표가 저장되었습니다.')).toBeNull()
  })

  it('restores "my vote" from the server after a reload (no vote made on this page)', async () => {
    mockFetch((url) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') {
        return { body: { pollId: 1, phase: 'RESULTS_HIDDEN', voted: true, participantCount: 3, myOptionId: 4 } }
      }
      return undefined
    })
    renderRoute('/polls/1')

    await screen.findByText('후보 B')
    await waitFor(() => expect(within(cardOf('후보 B')).getByRole('button', { name: '내 투표 · 변경' })).toBeTruthy())
    expect(within(cardOf('후보 A')).getByRole('button', { name: '투표하기' })).toBeTruthy()
  })

  it('does not crash when results reference a candidate missing from the poll detail', async () => {
    mockFetch((url) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') {
        return { body: { ...visibleResults, results: [{ optionId: 99, voteCount: 9, percentage: 60 }, { optionId: 3, voteCount: 6, percentage: 40 }] } }
      }
      return undefined
    })
    renderRoute('/polls/1')

    expect(await screen.findByText(/40% · 6표/)).toBeTruthy()
    expect(screen.queryByText(/60% · 9표/)).toBeNull()
  })
})

describe('rank badges on candidate cards', () => {
  const badgeIn = (name: string, rank: string) => within(cardOf(name)).queryByText(rank)
  const renderWith = (detail: object, results: object) => {
    mockFetch((url) => {
      if (url === '/api/polls/1') return { body: detail }
      if (url === '/api/polls/1/results') return { body: results }
      return undefined
    })
    renderRoute('/polls/1')
  }
  const ranked = [{ optionId: 4, voteCount: 2, percentage: 66.7 }, { optionId: 3, voteCount: 1, percentage: 33.3 }]
  const closedDetail = { ...pollDetail, status: 'CLOSED', phase: 'CLOSED', endsAt: '2026-01-02T00:00:00Z' }

  it('hides ranks while voting is open and the viewer has not voted', async () => {
    renderWith(pollDetail, { pollId: 1, phase: 'LIVE_VISIBLE', voted: false, participantCount: 3 })
    await screen.findByText('후보 A')
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy()) // results loaded (participant count)
    expect(badgeIn('후보 A', '1')).toBeNull()
    expect(badgeIn('후보 B', '2')).toBeNull()
  })

  it('shows ranks while voting is open once the viewer has voted', async () => {
    renderWith(pollDetail, { pollId: 1, phase: 'LIVE_VISIBLE', voted: true, participantCount: 3, results: ranked })
    await waitFor(() => expect(badgeIn('후보 B', '1')).toBeTruthy())
    expect(badgeIn('후보 A', '2')).toBeTruthy()
  })

  it('hides ranks during the results-hidden window even for voters', async () => {
    renderWith(pollDetail, { pollId: 1, phase: 'RESULTS_HIDDEN', voted: true, participantCount: 3 })
    await screen.findByText('후보 A')
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy())
    expect(badgeIn('후보 A', '1')).toBeNull()
    expect(badgeIn('후보 B', '2')).toBeNull()
  })

  it('shows ranks to everyone once the poll is closed, even without voting', async () => {
    renderWith(closedDetail, { pollId: 1, phase: 'CLOSED', voted: false, participantCount: 3, results: ranked })
    await waitFor(() => expect(badgeIn('후보 B', '1')).toBeTruthy())
    expect(badgeIn('후보 A', '2')).toBeTruthy()
  })
})

describe('SSE', () => {
  it('writes vote-result payloads into the results cache without refetching', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') return { body: visibleResults }
      return undefined
    })
    const resultsCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/polls/1/results').length
    renderRoute('/polls/1')

    await screen.findByText(/100% · 6표/)
    const before = resultsCalls()
    const stream = latestStream()
    expect(stream.url).toBe('/api/polls/1/stream')

    act(() => stream.emit('vote-result', {
      pollId: 1, phase: 'LIVE_VISIBLE', voted: true, participantCount: 10,
      results: [{ optionId: 4, voteCount: 5, percentage: 50 }, { optionId: 3, voteCount: 5, percentage: 50 }],
    }))

    expect((await screen.findAllByText(/50% · 5표/)).length).toBe(2)
    expect(resultsCalls()).toBe(before)
  })

  it('refetches both the poll detail and the results on phase-changed', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/polls/1') return { body: pollDetail }
      if (url === '/api/polls/1/results') return { body: hiddenResults }
      return undefined
    })
    const callsTo = (target: string) => fetchMock.mock.calls.filter(([url]) => url === target).length
    renderRoute('/polls/1')

    await screen.findByText('후보 A')
    await waitFor(() => expect(callsTo('/api/polls/1/results')).toBeGreaterThan(0))
    const detailBefore = callsTo('/api/polls/1')
    const resultsBefore = callsTo('/api/polls/1/results')

    act(() => latestStream().emit('phase-changed', { phase: 'RESULTS_HIDDEN' }))

    await waitFor(() => {
      expect(callsTo('/api/polls/1')).toBeGreaterThan(detailBefore)
      expect(callsTo('/api/polls/1/results')).toBeGreaterThan(resultsBefore)
    })
  })

  it('keeps a vote-result payload when an older in-flight results fetch lands afterwards', async () => {
    let resultsCall = 0
    const stale = { ...visibleResults, participantCount: 6 }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/polls/1') return { ok: true, status: 200, json: async () => pollDetail }
      if (url === '/api/polls/1/results') {
        resultsCall += 1
        // First call answers immediately; later calls are slow and carry an older snapshot.
        if (resultsCall > 1) await new Promise((resolve) => setTimeout(resolve, 80))
        return { ok: true, status: 200, json: async () => stale }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    }))
    renderRoute('/polls/1')

    await screen.findByText(/100% · 6표/)
    act(() => latestStream().emit('phase-changed', { phase: 'LIVE_VISIBLE' })) // starts a slow results refetch
    await waitFor(() => expect(resultsCall).toBeGreaterThan(1))
    act(() => latestStream().emit('vote-result', {
      pollId: 1, phase: 'LIVE_VISIBLE', voted: true, participantCount: 10,
      results: [{ optionId: 4, voteCount: 5, percentage: 50 }, { optionId: 3, voteCount: 5, percentage: 50 }],
    }))

    expect((await screen.findAllByText(/50% · 5표/)).length).toBe(2)
    await new Promise((resolve) => setTimeout(resolve, 150)) // let the slow fetch settle
    expect(screen.getAllByText(/50% · 5표/).length).toBe(2)
    expect(screen.queryByText(/100% · 6표/)).toBeNull()
  })
})

describe('admin', () => {
  const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
  const basic = (username: string, password: string) => `Basic ${btoa(`${username}:${password}`)}`
  const submitLogin = () => fireEvent.submit(screen.getByRole('button', { name: '관리자 입장' }).closest('form') as HTMLFormElement)

  it('lets the admin retry with a corrected password for the same username', async () => {
    mockFetch((url, init) => {
      if (url === '/api/admin/polls') {
        return headerOf(init, 'Authorization') === basic('admin', 'right') ? { body: emptyPage } : { status: 401, body: {} }
      }
      return undefined
    })
    renderRoute('/admin')

    // Admin routes are lazy-loaded, so allow for the first chunk load.
    await screen.findByRole('heading', { name: '관리자 입장' }, { timeout: 5000 })
    fireEvent.change(screen.getByLabelText(/아이디/), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'wrong' } })
    submitLogin()
    expect(await screen.findByText('관리자 계정을 확인해 주세요.')).toBeTruthy()
    expect(sessionStorage.getItem('admin-credentials')).toBeNull()

    fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'right' } })
    submitLogin()
    expect(await screen.findByRole('heading', { name: '내가 만든 투표' })).toBeTruthy()
  })

  it('drops stored credentials that the server rejects and keeps the message on the login form', async () => {
    sessionStorage.setItem('admin-credentials', JSON.stringify({ username: 'admin', password: 'old' }))
    mockFetch((url) => (url === '/api/admin/polls' ? { status: 401, body: {} } : undefined))
    renderRoute('/admin')

    expect(await screen.findByText('관리자 계정을 확인해 주세요.', undefined, { timeout: 5000 })).toBeTruthy()
    await waitFor(() => expect(sessionStorage.getItem('admin-credentials')).toBeNull())
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull()
    expect(screen.getByRole('link', { name: '관리자 페이지' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '관리자 입장' })).toBeTruthy()
  })

  it('disables the login button while the login request is pending', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderRoute('/admin')

    await screen.findByRole('heading', { name: '관리자 입장' }, { timeout: 5000 })
    fireEvent.change(screen.getByLabelText(/아이디/), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'right' } })
    submitLogin()
    await waitFor(() => expect(screen.getByRole('button', { name: '관리자 입장' }).hasAttribute('disabled')).toBe(true))
  })

  it('drops credentials when an admin action is rejected as unauthenticated', async () => {
    sessionStorage.setItem('admin-credentials', JSON.stringify({ username: 'admin', password: 'right' }))
    mockFetch((url, init) => {
      if (url === '/api/admin/polls') {
        return { body: { ...emptyPage, totalElements: 1, totalPages: 1, content: [{ pollId: 7, title: '예약 투표', status: 'SCHEDULED', phase: 'SCHEDULED', participantCount: 0, startsAt: FUTURE, endsAt: FUTURE }] } }
      }
      if (url === '/api/admin/polls/7/start' && init?.method === 'POST') return { status: 401, body: {} }
      return undefined
    })
    renderRoute('/admin')

    fireEvent.click(await screen.findByRole('button', { name: '개시' }, { timeout: 5000 }))
    expect(await screen.findByText('관리자 계정을 확인해 주세요.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '관리자 입장' })).toBeTruthy()
    expect(sessionStorage.getItem('admin-credentials')).toBeNull()
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull()
  })

  it('drops credentials when the edit page is rejected as unauthenticated', async () => {
    sessionStorage.setItem('admin-credentials', JSON.stringify({ username: 'admin', password: 'old' }))
    mockFetch((url) => (url === '/api/admin/polls/7' ? { status: 401, body: {} } : undefined))
    renderRoute('/admin/polls/7/edit')

    expect(await screen.findByText('관리자 로그인이 필요합니다.', undefined, { timeout: 5000 })).toBeTruthy()
    expect(sessionStorage.getItem('admin-credentials')).toBeNull()
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull()
  })

  it('shows server errors inside the console instead of the login form', async () => {
    sessionStorage.setItem('admin-credentials', JSON.stringify({ username: 'admin', password: 'right' }))
    mockFetch((url) => (url === '/api/admin/polls' ? { status: 500, body: {} } : undefined))
    renderRoute('/admin')

    expect(await screen.findByText('관리자 요청을 처리하지 못했습니다.', undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '내가 만든 투표' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '관리자 입장' })).toBeNull()
  })

  it('shows an error when a status transition fails', async () => {
    sessionStorage.setItem('admin-credentials', JSON.stringify({ username: 'admin', password: 'right' }))
    mockFetch((url, init) => {
      if (url === '/api/admin/polls') {
        return { body: { ...emptyPage, totalElements: 1, totalPages: 1, content: [{ pollId: 7, title: '예약 투표', status: 'SCHEDULED', phase: 'SCHEDULED', participantCount: 0, startsAt: FUTURE, endsAt: FUTURE }] } }
      }
      if (url === '/api/admin/polls/7/start' && init?.method === 'POST') return { status: 409, body: {} }
      return undefined
    })
    renderRoute('/admin')

    fireEvent.click(await screen.findByRole('button', { name: '개시' }, { timeout: 5000 }))
    expect(await screen.findByText('관리자 요청을 처리하지 못했습니다.')).toBeTruthy()
  })
})

describe('poll list', () => {
  it('shows a poll whose end time has passed as closed even if its status is still OPEN', async () => {
    mockFetch((url) => {
      if (url === '/api/polls') {
        return { body: [{ pollId: 1, title: '지난 투표', type: 'SINGLE', maxSelections: 1, status: 'OPEN', startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-01-02T00:00:00Z', participantCount: 3 }] }
      }
      return undefined
    })
    renderRoute('/')

    await screen.findAllByText('지난 투표')
    expect(screen.getAllByText('종료됨').length).toBeGreaterThan(0)
    expect(screen.queryByText('진행 중')).toBeNull()
  })

  it('shows participant counts from the list response without a results request per card', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/polls') {
        return { body: [
          { pollId: 1, title: '첫 투표', type: 'SINGLE', maxSelections: 1, status: 'OPEN', startsAt: '2026-01-01T00:00:00Z', endsAt: FUTURE, participantCount: 12 },
          { pollId: 2, title: '둘째 투표', type: 'SINGLE', maxSelections: 1, status: 'OPEN', startsAt: '2026-01-01T00:00:00Z', endsAt: FUTURE, participantCount: 1234 },
        ] }
      }
      return undefined
    })
    renderRoute('/')

    expect(await screen.findByText('12명 참여')).toBeTruthy()
    expect(screen.getByText('1,234명 참여')).toBeTruthy()
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/polls'])
  })
})

describe('createIdempotencyKey', () => {
  it('falls back to a v4 UUID when crypto.randomUUID is unavailable (plain HTTP)', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true, writable: true })
    try {
      const keys = new Set(Array.from({ length: 200 }, () => createIdempotencyKey()))
      expect(keys.size).toBe(200)
      for (const key of keys) expect(key).toMatch(UUID_V4)
    } finally {
      delete (crypto as Partial<Crypto>).randomUUID
    }
    expect(createIdempotencyKey()).toMatch(UUID_V4)
  })
})
