import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { createAdminPoll, deleteAdminPoll, fetchAdminPolls, isAuthError, transitionAdminPoll, type AdminCredentials, type AdminPollAction, type AdminPollInput } from '../api/adminApi'
import { AdminLoginForm } from '../components/AdminLoginForm'
import { AdminPollForm } from '../components/AdminPollForm'
import { AdminPollTable } from '../components/AdminPollTable'
import { DeletePollDialog, type DeleteTarget } from '../components/DeletePollDialog'
import { PageStatus } from '../components/PageStatus'
import { useAdminAuth } from '../lib/adminAuth'
import { useAdminAuthFailure } from '../hooks/useAdminAuthFailure'
import { queryKeys } from '../lib/queryKeys'
import { toAdminPollInput } from '../lib/adminPollInput'
import { tokens } from '../theme'

export function AdminPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { credentials, login: setCredentials } = useAdminAuth()
  const [login, setLogin] = useState({ username: '', password: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const pollsQuery = useQuery({ queryKey: queryKeys.adminPolls(credentials?.username), queryFn: () => fetchAdminPolls(credentials!), enabled: Boolean(credentials), retry: false })
  // Stored credentials can stop working later (password changed, or saved before login was
  // verified). Drop them so the header stops offering "로그아웃", but keep the server's message
  // for the login form — logging out switches pollsQuery to a disabled key and loses its error.
  const [authFailureMessage, setAuthFailureMessage] = useState<string>()
  const staleCredentialsError = isAuthError(pollsQuery.error) ? pollsQuery.error : null
  const handleAuthError = useAdminAuthFailure(pollsQuery.error, setAuthFailureMessage)
  // Same handling when an admin action (not the list query) is rejected; also close the delete dialog.
  const dropRejectedCredentials = (error: Error) => {
    if (handleAuthError(error)) setDeleteTarget(null)
  }
  // Verify credentials before storing them. Storing first and letting pollsQuery fetch meant a
  // retry with the same username but a corrected password kept the same queryKey, so the query
  // never re-ran and stayed in its error state. Seeding the cache on success also clears that state.
  const loginMutation = useMutation({
    mutationFn: (next: AdminCredentials) => fetchAdminPolls(next),
    onSuccess: (data, next) => {
      queryClient.setQueryData(queryKeys.adminPolls(next.username), data)
      setAuthFailureMessage(undefined)
      // Clear errors left by actions that failed with the previous (rejected) credentials.
      transition.reset()
      create.reset()
      deletePoll.reset()
      setCredentials(next)
    },
  })
  const loginError = loginMutation.isError ? loginMutation.error.message : staleCredentialsError?.message ?? authFailureMessage
  const transition = useMutation({
    mutationFn: ({ pollId, action }: { pollId: number; action: AdminPollAction }) => transitionAdminPoll(credentials!, pollId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminPollsAll() }),
    onError: dropRejectedCredentials,
  })
  const create = useMutation({
    mutationFn: (input: AdminPollInput) => createAdminPoll(credentials!, input),
    onSuccess: () => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: queryKeys.adminPollsAll() }) },
    onError: dropRejectedCredentials,
  })
  const deletePoll = useMutation({
    mutationFn: (pollId: number) => deleteAdminPoll(credentials!, pollId),
    onSuccess: () => { setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: queryKeys.adminPollsAll() }) },
    onError: dropRejectedCredentials,
  })

  // Only authentication failures send the admin back to the login form; other failures
  // (5xx, network) are shown inside the console instead of looking like a bad password.
  if (!credentials || isAuthError(pollsQuery.error)) {
    return (
      <Box component="main" sx={{ maxWidth: 1240, margin: '0 auto', padding: '16px 22px 60px', display: 'flex', justifyContent: 'center' }}>
        <AdminLoginForm
          login={login}
          onLoginChange={setLogin}
          loginError={loginError}
          pending={loginMutation.isPending}
          onSubmit={() => loginMutation.mutate(login)}
        />
      </Box>
    )
  }

  const polls = pollsQuery.data?.content ?? []

  return (
    <Box component="main" sx={{ maxWidth: 1240, margin: '0 auto', padding: '16px 22px 60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box>
          <Chip label="ADMIN CONSOLE" sx={{ background: tokens.color.textPrimary, color: '#FFFFFF', fontSize: 11, marginBottom: '10px' }} />
          <Typography component="h1" sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', color: tokens.color.textPrimary }}>
            내가 만든 투표
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: tokens.color.textTertiary, marginTop: '4px' }}>
            투표 생성과 개시·마감·삭제를 관리합니다.
          </Typography>
        </Box>
        <Button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          sx={{ background: tokens.color.accent, color: '#FFFFFF', padding: '11px 20px', '&:hover': { background: tokens.color.accentDark } }}
        >
          + 새 투표 만들기
        </Button>
      </Stack>

      {showCreate && (
        <AdminPollForm
          mode="create"
          pending={create.isPending}
          error={create.isError ? create.error.message : undefined}
          onSubmit={(values) => create.mutate(toAdminPollInput(values))}
        />
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: '16px' }}>
        {[
          { label: '전체 투표', value: pollsQuery.data?.totalElements ?? 0 },
          { label: '진행 중', value: polls.filter((poll) => poll.status === 'OPEN').length },
          { label: '전체 참여', value: polls.reduce((sum, poll) => sum + poll.participantCount, 0).toLocaleString() },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              background: tokens.color.surface,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: `${tokens.radius.md}px`,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: tokens.color.textMuted }}>{stat.label}</Typography>
            <Typography sx={{ fontFamily: tokens.fontFamily.display, fontSize: 28, fontWeight: 700, color: tokens.color.textPrimary }}>{stat.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="section"
        sx={{
          background: tokens.color.surface,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: `${tokens.radius.md}px`,
          padding: '22px 24px 8px',
        }}
      >
        <Box sx={{ marginBottom: '14px' }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
            투표 운영 현황
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: tokens.color.textFaint, marginTop: '4px' }}>
            상태 변경은 서버에서 권한·현재 상태·시간을 다시 검증합니다.
          </Typography>
          {transition.isError && (
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText, marginTop: '10px' }}>
              {transition.error.message}
            </Typography>
          )}
        </Box>

        {pollsQuery.isPending ? (
          <Box sx={{ paddingBottom: '20px' }}><PageStatus>관리자 투표를 불러오는 중입니다.</PageStatus></Box>
        ) : pollsQuery.isError ? (
          <Box sx={{ paddingBottom: '20px' }}><PageStatus>{pollsQuery.error.message}</PageStatus></Box>
        ) : (
          <AdminPollTable
            polls={polls}
            transitionPending={transition.isPending}
            onEdit={(pollId) => navigate(`/admin/polls/${pollId}/edit`)}
            onTransition={(pollId, action) => transition.mutate({ pollId, action })}
            onDelete={setDeleteTarget}
          />
        )}
      </Box>

      <DeletePollDialog
        deleteTarget={deleteTarget}
        pending={deletePoll.isPending}
        error={deletePoll.isError ? deletePoll.error.message : undefined}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pollId) => deletePoll.mutate(pollId)}
      />
    </Box>
  )
}
