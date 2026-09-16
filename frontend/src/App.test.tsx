import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
beforeEach(() => vi.stubGlobal('EventSource', class {
  addEventListener() {}
  close() {}
}))

function renderRoute(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><App /></MemoryRouter></QueryClientProvider>)
}

function mockJson(data: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) }))
}

describe('Poll API screens', () => {
  it('renders polls returned by the list API', async () => {
    mockJson([{ pollId: 1, title: '오늘의 투표', type: 'SINGLE', maxSelections: 1, status: 'OPEN', startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-30T00:00:00Z' }])
    renderRoute('/')

    expect(await screen.findByText('오늘의 투표')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/api/polls')
  })

  it('renders candidates returned by the detail API', async () => {
    mockJson({ pollId: 1, title: '오늘의 투표', description: '한 명을 골라주세요.', type: 'SINGLE', maxSelections: 1, status: 'OPEN', startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-30T00:00:00Z', options: [{ optionId: 3, name: '후보 A', imageUrl: null, team: 'A팀' }] })
    renderRoute('/polls/1')

    expect(await screen.findByText('후보 A')).toBeTruthy()
    expect(screen.getByText('현재 랭킹 TOP 3')).toBeTruthy()
    expect(screen.getByText('실시간 투표 현황')).toBeTruthy()
    expect(screen.getByText('마감 정책')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/api/polls/1')
  })

  it('renders live results returned by the results API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((path: string) => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(path.endsWith('/results')
        ? { pollId: 1, phase: 'LIVE_VISIBLE', voted: true, results: [{ optionId: 3, voteCount: 6, percentage: 100 }] }
        : { pollId: 1, title: 'Poll', description: 'Pick one', type: 'SINGLE', maxSelections: 1, status: 'OPEN', phase: 'LIVE_VISIBLE', startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-30T00:00:00Z', options: [{ optionId: 3, name: 'Candidate A', imageUrl: null, team: 'Team A' }] }),
    })))
    renderRoute('/polls/1')

    await waitFor(() => expect(document.querySelector('.result-main b')?.textContent).toContain('6'))
    expect(fetch).toHaveBeenCalledWith('/api/polls/1/results')
  })

  it('opens the administrator login screen', async () => {
    renderRoute('/admin')
    expect(screen.getByRole('heading', { name: '관리자 입장' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '관리자 입장' })).toBeTruthy()
  })
})
