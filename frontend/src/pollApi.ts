export type PollStatus = 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED'
export type PollPhase = 'NOT_OPEN' | 'SCHEDULED' | 'LIVE_VISIBLE' | 'RESULTS_HIDDEN' | 'CLOSED'

export interface PollSummary {
  pollId: number
  title: string
  type: string
  maxSelections: number
  status: PollStatus
  startsAt: string
  endsAt: string
}

export interface PollOption {
  optionId: number
  name: string
  imageUrl: string | null
  team: string | null
}

export interface PollDetail extends PollSummary {
  description: string | null
  phase: PollPhase
  options: PollOption[]
}

export interface PollResult {
  optionId: number
  voteCount: number
  percentage: number
}

export interface PollResults {
  pollId: number
  phase: PollPhase
  voted: boolean
  participantCount: number
  results?: PollResult[]
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('투표 정보를 불러오지 못했습니다.')
  return response.json() as Promise<T>
}

export const fetchOpenPolls = () => fetchJson<PollSummary[]>('/api/polls')
export const fetchPollDetails = (pollId: string) => fetchJson<PollDetail>(`/api/polls/${pollId}`)
export const fetchPollResults = (pollId: string) => fetchJson<PollResults>(`/api/polls/${pollId}/results`)

export interface VoteResponse { ballotId: number; optionId: number }

export async function castVote(pollId: string, optionId: number): Promise<VoteResponse> {
  const response = await fetch(`/api/polls/${pollId}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ optionId }),
  })
  if (!response.ok) throw new Error('투표를 저장하지 못했습니다.')
  return response.json() as Promise<VoteResponse>
}

export interface AdminCredentials { username: string; password: string }
export interface AdminPoll {
  pollId: number; title: string; status: PollStatus; phase: PollPhase
  participantCount: number; startsAt: string; endsAt: string
}
export interface AdminPollPage { content: AdminPoll[]; page: number; size: number; totalElements: number; totalPages: number }
export interface AdminPollInput {
  title: string; description: string; pollType: string; maxSelections: number
  startsAt: string; endsAt: string; options: { name: string; imageUrl?: string; team?: string }[]
}

const adminHeaders = (credentials: AdminCredentials) => ({
  'Content-Type': 'application/json',
  Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
})

async function adminJson<T>(path: string, credentials: AdminCredentials, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...adminHeaders(credentials), ...init?.headers } })
  if (response.status === 401 || response.status === 403) throw new Error('관리자 계정을 확인해 주세요.')
  if (!response.ok) throw new Error('관리자 요청을 처리하지 못했습니다.')
  return response.json() as Promise<T>
}

export const fetchAdminPolls = (credentials: AdminCredentials) => adminJson<AdminPollPage>('/api/admin/polls', credentials)
export const createAdminPoll = (credentials: AdminCredentials, input: AdminPollInput) => adminJson<AdminPoll>('/api/admin/polls', credentials, { method: 'POST', body: JSON.stringify(input) })
export const transitionAdminPoll = (credentials: AdminCredentials, pollId: number, action: 'start' | 'pause' | 'resume' | 'close') => adminJson<AdminPoll>(`/api/admin/polls/${pollId}/${action}`, credentials, { method: 'POST' })

export interface AdminPollDetailOption { optionId: number; name: string; imageUrl: string | null; team: string | null }
export interface AdminPollDetail {
  pollId: number
  title: string
  description: string | null
  status: PollStatus
  startsAt: string
  endsAt: string
  options: AdminPollDetailOption[]
}
export interface AdminPollUpdateInput {
  title: string
  description: string
  startsAt: string
  endsAt: string
  // optionId omitted => new candidate; optionId set => update that candidate.
  // Any existing optionId left out of this list is deleted.
  options: { optionId?: number; name: string; imageUrl?: string; team?: string }[]
}

export const fetchAdminPoll = (credentials: AdminCredentials, pollId: number) =>
  adminJson<AdminPollDetail>(`/api/admin/polls/${pollId}`, credentials)
export const updateAdminPoll = (credentials: AdminCredentials, pollId: number, input: AdminPollUpdateInput) =>
  adminJson<AdminPoll>(`/api/admin/polls/${pollId}`, credentials, { method: 'PATCH', body: JSON.stringify(input) })

export async function deleteAdminPoll(credentials: AdminCredentials, pollId: number): Promise<void> {
  const response = await fetch(`/api/admin/polls/${pollId}`, { method: 'DELETE', headers: adminHeaders(credentials) })
  if (response.status === 401 || response.status === 403) throw new Error('관리자 계정을 확인해 주세요.')
  if (response.status === 409) throw new Error('이미 투표한 기록이 있어 삭제할 수 없습니다.')
  if (!response.ok) throw new Error('투표를 삭제하지 못했습니다.')
}
