import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

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
    expect(fetch).toHaveBeenCalledWith('/api/polls/1')
  })
})
