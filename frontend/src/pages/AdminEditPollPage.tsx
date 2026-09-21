import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { fetchAdminPoll, updateAdminPoll, type AdminPollUpdateInput } from '../pollApi'
import { AdminPollForm } from '../components/AdminPollForm'
import { PageStatus } from '../components/PageStatus'
import { useAdminAuth } from '../lib/adminAuth'
import { tokens } from '../theme'

export function AdminEditPollPage() {
  const { pollId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { credentials } = useAdminAuth()

  const pollQuery = useQuery({
    queryKey: ['admin-poll', pollId],
    queryFn: () => fetchAdminPoll(credentials!, Number(pollId)),
    enabled: Boolean(credentials) && Boolean(pollId),
  })

  const update = useMutation({
    mutationFn: (input: AdminPollUpdateInput) => updateAdminPoll(credentials!, Number(pollId), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-polls'] })
      queryClient.invalidateQueries({ queryKey: ['admin-poll', pollId] })
      navigate('/admin')
    },
  })

  if (!credentials) {
    return (
      <Box component="main" sx={{ maxWidth: 900, margin: '0 auto', padding: '16px 22px 60px' }}>
        <PageStatus>관리자 로그인이 필요합니다.</PageStatus>
      </Box>
    )
  }

  return (
    <Box component="main" sx={{ maxWidth: 900, margin: '0 auto', padding: '16px 22px 60px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Box
        component={RouterLink}
        to="/admin"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px 8px 10px',
          marginLeft: '-10px',
          borderRadius: `${tokens.radius.sm}px`,
          fontSize: 13,
          fontWeight: 600,
          color: tokens.color.textSecondary,
          textDecoration: 'none',
          width: 'fit-content',
          '&:hover': { background: tokens.color.surfaceMuted, color: tokens.color.textPrimary },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 15 }} />
        관리자 목록으로
      </Box>

      {pollQuery.isPending ? (
        <PageStatus>투표 정보를 불러오는 중입니다.</PageStatus>
      ) : pollQuery.isError ? (
        <PageStatus>{(pollQuery.error as Error).message}</PageStatus>
      ) : (
        <AdminPollForm
          mode="edit"
          pending={update.isPending}
          error={update.isError ? (update.error as Error).message : undefined}
          initial={{
            title: pollQuery.data.title,
            startsAt: pollQuery.data.startsAt,
            endsAt: pollQuery.data.endsAt,
            options: pollQuery.data.options.map((option) => ({
              optionId: option.optionId,
              name: option.name,
              team: option.team ?? '',
              imageUrl: option.imageUrl ?? '',
            })),
          }}
          onSubmit={(values) =>
            update.mutate({
              title: values.title,
              description: '',
              startsAt: values.startsAt,
              endsAt: values.endsAt,
              options: values.options.map((option) => ({
                optionId: option.optionId,
                name: option.name,
                team: option.team || undefined,
                imageUrl: option.imageUrl || undefined,
              })),
            })
          }
        />
      )}
    </Box>
  )
}
