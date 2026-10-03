// Admin API: every request carries HTTP Basic credentials; failures are thrown as ApiError with the status.

import type { PollPhase, PollStatus } from './pollApi'

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

/** Error carrying the HTTP status so callers can tell auth failures from server errors. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const isAuthError = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.status === 401 || error.status === 403)

async function adminRequest(path: string, credentials: AdminCredentials, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, headers: { ...adminHeaders(credentials), ...init?.headers } })
  if (response.status === 401 || response.status === 403) throw new ApiError('관리자 계정을 확인해 주세요.', response.status)
  return response
}

async function adminJson<T>(path: string, credentials: AdminCredentials, init?: RequestInit): Promise<T> {
  const response = await adminRequest(path, credentials, init)
  if (!response.ok) throw new ApiError('관리자 요청을 처리하지 못했습니다.', response.status)
  return response.json() as Promise<T>
}

export const fetchAdminPolls = (credentials: AdminCredentials) => adminJson<AdminPollPage>('/api/admin/polls', credentials)
export const createAdminPoll = (credentials: AdminCredentials, input: AdminPollInput) => adminJson<AdminPoll>('/api/admin/polls', credentials, { method: 'POST', body: JSON.stringify(input) })
export type AdminPollAction = 'start' | 'pause' | 'resume' | 'close'
export const transitionAdminPoll = (credentials: AdminCredentials, pollId: number, action: AdminPollAction) => adminJson<AdminPoll>(`/api/admin/polls/${pollId}/${action}`, credentials, { method: 'POST' })

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
  const response = await adminRequest(`/api/admin/polls/${pollId}`, credentials, { method: 'DELETE' })
  if (response.status === 409) throw new ApiError('이미 투표한 기록이 있어 삭제할 수 없습니다.', response.status)
  if (!response.ok) throw new ApiError('투표를 삭제하지 못했습니다.', response.status)
}
