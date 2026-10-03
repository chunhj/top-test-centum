import { afterEach, expect, it, vi } from 'vitest'
import { deleteAdminPoll } from './adminApi'

afterEach(() => vi.unstubAllGlobals())

it('handles a bodyless delete and keeps conflict and auth errors distinct', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 204 })
    .mockResolvedValueOnce({ ok: false, status: 409 })
    .mockResolvedValueOnce({ ok: false, status: 401 })
  vi.stubGlobal('fetch', fetchMock)
  const credentials = { username: 'admin', password: 'secret' }

  await expect(deleteAdminPoll(credentials, 1)).resolves.toBeUndefined()
  await expect(deleteAdminPoll(credentials, 1)).rejects.toMatchObject({ status: 409, message: '이미 투표한 기록이 있어 삭제할 수 없습니다.' })
  await expect(deleteAdminPoll(credentials, 1)).rejects.toMatchObject({ status: 401, message: '관리자 계정을 확인해 주세요.' })
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/polls/1', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa('admin:secret')}` },
  })
})
