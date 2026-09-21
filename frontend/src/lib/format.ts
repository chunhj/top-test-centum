import type { PollStatus } from '../pollApi'

export const statusLabel: Record<PollStatus, string> = {
  SCHEDULED: '시작 예정', OPEN: '진행 중', PAUSED: '일시정지', CLOSED: '마감',
}

export const statusTone: Record<PollStatus, { background: string; color: string }> = {
  OPEN: { background: '#E7F5F0', color: '#1A5F52' },
  SCHEDULED: { background: '#FDE7EE', color: '#8E1E44' },
  PAUSED: { background: '#FDE7EE', color: '#8E1E44' },
  CLOSED: { background: '#EFF0EC', color: '#6B7169' },
}

/**
 * `status` is only flipped by an admin action (start/pause/resume/close) — it doesn't
 * auto-update when `endsAt` passes. Use this wherever a status badge is shown to the
 * viewer so a poll that's actually over reads as closed even if nobody closed it yet.
 */
export function effectiveStatus(status: PollStatus, endsAt: string, now = Date.now()): PollStatus {
  if (status !== 'CLOSED' && new Date(endsAt).getTime() <= now) return 'CLOSED'
  return status
}

export const formatDateTime = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

/** "N일 M시간 남음" style label, mirroring the `ui/` mockup's remaining-time copy. */
export function formatRemaining(endsAt: string, now = Date.now()) {
  const minutes = Math.floor((new Date(endsAt).getTime() - now) / 60_000)
  if (minutes <= 0) return '종료됨'
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = Math.floor(minutes % 60)
  if (days > 0) return `${days}일 ${hours > 0 ? `${hours}시간 ` : ''}남음`
  if (hours > 0) return `${hours}시간 ${mins > 0 ? `${mins}분 ` : ''}남음`
  return `${mins}분 남음`
}
