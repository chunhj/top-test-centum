import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createAdminPoll, deleteAdminPoll, fetchAdminPolls, transitionAdminPoll, type AdminPollInput, type PollStatus } from '../pollApi'
import { AdminPollForm } from '../components/AdminPollForm'
import { PageStatus } from '../components/PageStatus'
import { statusLabel, statusTone, formatDateTime } from '../lib/format'
import { useAdminAuth } from '../lib/adminAuth'
import { tokens } from '../theme'

export function AdminPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { credentials, login: setCredentials } = useAdminAuth()
  const [login, setLogin] = useState({ username: '', password: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ pollId: number; title: string } | null>(null)
  const pollsQuery = useQuery({ queryKey: ['admin-polls', credentials?.username], queryFn: () => fetchAdminPolls(credentials!), enabled: Boolean(credentials), retry: false })
  const transition = useMutation({
    mutationFn: ({ pollId, action }: { pollId: number; action: 'start' | 'pause' | 'resume' | 'close' }) => transitionAdminPoll(credentials!, pollId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-polls'] }),
  })
  const create = useMutation({
    mutationFn: (input: AdminPollInput) => createAdminPoll(credentials!, input),
    onSuccess: () => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['admin-polls'] }) },
  })
  const deletePoll = useMutation({
    mutationFn: (pollId: number) => deleteAdminPoll(credentials!, pollId),
    onSuccess: () => { setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['admin-polls'] }) },
  })

  if (!credentials || pollsQuery.isError) {
    return (
      <Box component="main" sx={{ maxWidth: 1240, margin: '0 auto', padding: '16px 22px 60px', display: 'flex', justifyContent: 'center' }}>
        <Box
          component="form"
          onSubmit={(event) => { event.preventDefault(); setCredentials(login) }}
          sx={{
            width: '100%',
            maxWidth: 400,
            marginTop: 'clamp(24px, 6vh, 64px)',
            background: tokens.color.surface,
            border: `1px solid ${tokens.color.border}`,
            borderRadius: `${tokens.radius.md}px`,
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <Chip label="ADMIN" sx={{ alignSelf: 'flex-start', background: tokens.color.textPrimary, color: '#FFFFFF', fontSize: 11 }} />
          <Box>
            <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
              관리자 입장
            </Typography>
            <Typography sx={{ fontSize: 13, color: tokens.color.textTertiary, marginTop: '6px' }}>
              투표를 생성하고 운영 상태를 관리합니다.
            </Typography>
          </Box>
          <TextField required autoComplete="username" label="아이디" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} fullWidth />
          <TextField required type="password" autoComplete="current-password" label="비밀번호" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} fullWidth />
          {pollsQuery.isError && (
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText }}>{pollsQuery.error.message}</Typography>
          )}
          <Button type="submit" sx={{ background: tokens.color.textPrimary, color: '#FFFFFF', padding: '12px', '&:hover': { background: '#000000' } }}>
            관리자 입장
          </Button>
        </Box>
      </Box>
    )
  }

  const polls = pollsQuery.data?.content ?? []
  const actionFor = (status: PollStatus) => (status === 'SCHEDULED' ? 'start' : undefined)
  const actionLabel = { start: '개시' } as const

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
          error={create.isError ? (create.error as Error).message : undefined}
          onSubmit={(values) =>
            create.mutate({
              title: values.title,
              description: '',
              pollType: 'SINGLE',
              maxSelections: 1,
              startsAt: values.startsAt,
              endsAt: values.endsAt,
              options: values.options.map((option) => ({
                name: option.name,
                team: option.team || undefined,
                imageUrl: option.imageUrl || undefined,
              })),
            })
          }
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
        </Box>

        {pollsQuery.isPending ? (
          <Box sx={{ paddingBottom: '20px' }}><PageStatus>관리자 투표를 불러오는 중입니다.</PageStatus></Box>
        ) : (
          <TableContainer sx={{ marginBottom: '8px' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>투표명</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>상태</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>참여</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>마감</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>운영</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {polls.map((poll) => {
                  const action = actionFor(poll.status)
                  const tone = statusTone[poll.status]
                  return (
                    <TableRow key={poll.pollId}>
                      <TableCell><Typography sx={{ fontWeight: 700, color: tokens.color.textPrimary }}>{poll.title}</Typography></TableCell>
                      <TableCell>
                        <Chip label={statusLabel[poll.status]} size="small" sx={{ background: tone.background, color: tone.color, fontSize: 11.5 }} />
                      </TableCell>
                      <TableCell>{poll.participantCount.toLocaleString()}</TableCell>
                      <TableCell>{formatDateTime(poll.endsAt)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            onClick={() => navigate(`/admin/polls/${poll.pollId}/edit`)}
                            sx={{ background: tokens.color.surfaceMuted, color: tokens.color.textPrimary, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.border } }}
                          >
                            수정
                          </Button>
                          {action && (
                            <Button
                              size="small"
                              onClick={() => transition.mutate({ pollId: poll.pollId, action })}
                              sx={{ background: tokens.color.surfaceMuted, color: tokens.color.textPrimary, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.border } }}
                            >
                              {actionLabel[action]}
                            </Button>
                          )}
                          {poll.status !== 'CLOSED' && (
                            <Button
                              size="small"
                              onClick={() => transition.mutate({ pollId: poll.pollId, action: 'close' })}
                              sx={{ background: tokens.color.urgentBg, color: tokens.color.urgentText, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.urgentBg, opacity: 0.85 } }}
                            >
                              마감
                            </Button>
                          )}
                          <Button
                            size="small"
                            onClick={() => setDeleteTarget({ pollId: poll.pollId, title: poll.title })}
                            sx={{ background: '#C62828', color: '#FFFFFF', fontSize: 12, padding: '6px 12px', '&:hover': { background: '#9F1C1C' } }}
                          >
                            삭제
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={Boolean(deleteTarget)} onClose={() => (deletePoll.isPending ? undefined : setDeleteTarget(null))}>
        <DialogTitle sx={{ fontWeight: 800 }}>투표 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget ? `'${deleteTarget.title}' 투표를 삭제하시겠습니까?` : '투표를 삭제하시겠습니까?'} 삭제하면 되돌릴 수 없습니다.
          </DialogContentText>
          {deletePoll.isError && (
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText, marginTop: '10px' }}>
              {(deletePoll.error as Error).message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '0 24px 20px' }}>
          <Button type="button" onClick={() => setDeleteTarget(null)} disabled={deletePoll.isPending} sx={{ color: tokens.color.textSecondary }}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => deleteTarget && deletePoll.mutate(deleteTarget.pollId)}
            disabled={deletePoll.isPending}
            sx={{ background: '#C62828', color: '#FFFFFF', padding: '8px 18px', '&:hover': { background: '#9F1C1C' } }}
          >
            {deletePoll.isPending ? '삭제 중' : '확인'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
