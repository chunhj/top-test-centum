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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('투표 정보를 불러오지 못했습니다.')
  return response.json() as Promise<T>
}

export const getPolls = () => getJson<PollSummary[]>('/api/polls')
export const getPoll = (pollId: string) => getJson<PollDetail>(`/api/polls/${pollId}`)
export const getResults = (pollId: string) => getJson<PollResults>(`/api/polls/${pollId}/results`)

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
