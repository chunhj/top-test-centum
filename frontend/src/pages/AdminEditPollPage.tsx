import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import { fetchAdminPoll, updateAdminPoll, type AdminPollUpdateInput } from '../api/adminApi'
import { AdminPollForm } from '../components/AdminPollForm'
import { PageStatus } from '../components/PageStatus'
import { BackLink } from '../components/BackLink'
import { useAdminAuth } from '../lib/adminAuth'
import { useAdminAuthFailure } from '../hooks/useAdminAuthFailure'
import { queryKeys } from '../lib/queryKeys'
import { toAdminPollFormValues, toAdminPollUpdateInput } from '../lib/adminPollInput'

export function AdminEditPollPage() {
  const { pollId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { credentials } = useAdminAuth()

  const pollQuery = useQuery({
    queryKey: queryKeys.adminPoll(pollId),
    queryFn: () => fetchAdminPoll(credentials!, Number(pollId)),
    enabled: Boolean(credentials) && Boolean(pollId),
  })

  // Rejected credentials are dropped so the header and this page fall back to the logged-out state.
  const handleAuthError = useAdminAuthFailure(pollQuery.error)

  const update = useMutation({
    mutationFn: (input: AdminPollUpdateInput) => updateAdminPoll(credentials!, Number(pollId), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPollsAll() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPoll(pollId) })
      navigate('/admin')
    },
    onError: (error) => {
      handleAuthError(error)
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
      <BackLink to="/admin">관리자 목록으로</BackLink>

      {pollQuery.isPending ? (
        <PageStatus>투표 정보를 불러오는 중입니다.</PageStatus>
      ) : pollQuery.isError ? (
        <PageStatus>{pollQuery.error.message}</PageStatus>
      ) : (
        <AdminPollForm
          mode="edit"
          pending={update.isPending}
          error={update.isError ? update.error.message : undefined}
          initial={toAdminPollFormValues(pollQuery.data)}
          onSubmit={(values) => update.mutate(toAdminPollUpdateInput(values))}
        />
      )}
    </Box>
  )
}
