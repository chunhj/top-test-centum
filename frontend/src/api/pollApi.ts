// Public (voter-facing) API: poll list/detail/results and casting a vote.

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

/** Item of GET /api/polls: the poll summary plus its live participant count. */
export interface PollListItem extends PollSummary {
  participantCount: number
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
  /** The viewer's own current selection; omitted when they have not voted. */
  myOptionId?: number
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('투표 정보를 불러오지 못했습니다.')
  return response.json() as Promise<T>
}

export const fetchOpenPolls = () => fetchJson<PollListItem[]>('/api/polls')
export const fetchPollDetails = (pollId: string) => fetchJson<PollDetail>(`/api/polls/${pollId}`)
export const fetchPollResults = (pollId: string) => fetchJson<PollResults>(`/api/polls/${pollId}/results`)

export interface VoteResponse { ballotId: number; optionId: number }

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS / localhost), so a plain-HTTP
 * deployment would throw before the vote request is sent. Fall back to an RFC 4122 v4 UUID
 * built from crypto.getRandomValues(), which is available in every context. The backend
 * parses this header as a UUID, so the fallback must keep the same format.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function castVote(pollId: string, optionId: number): Promise<VoteResponse> {
  const response = await fetch(`/api/polls/${pollId}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({ optionId }),
  })
  if (!response.ok) throw new Error('투표를 저장하지 못했습니다.')
  return response.json() as Promise<VoteResponse>
}
