export type PollStatus = 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED'

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
  options: PollOption[]
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('투표 정보를 불러오지 못했습니다.')
  return response.json() as Promise<T>
}

export const getPolls = () => getJson<PollSummary[]>('/api/polls')
export const getPoll = (pollId: string) => getJson<PollDetail>(`/api/polls/${pollId}`)
