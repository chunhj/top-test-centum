import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { castVote, fetchPollDetails, fetchPollResults, type PollResults } from '../api/pollApi'
import { PageStatus } from '../components/PageStatus'
import { BackLink } from '../components/BackLink'
import { CandidateSection } from '../components/CandidateSection'
import { VoteNotice } from '../components/VoteNotice'
import { RankingsPanel } from '../components/RankingsPanel'
import { ResultsSidebar } from '../components/ResultsSidebar'
import { PollHero } from '../components/PollHero'
import { effectiveStatus } from '../lib/format'
import { canShowRanks, createRankLookup } from '../lib/results'
import { queryKeys } from '../lib/queryKeys'
import { usePollResultsStream } from '../hooks/usePollResultsStream'
import { tokens } from '../theme'

export function PollDetailPage() {
  const { pollId = '' } = useParams()
  // Keyed by pollId so local state (sort, toast) and the vote mutation state reset
  // when the route moves to another poll without unmounting the page.
  return <PollDetailView key={pollId} pollId={pollId} />
}

function PollDetailView({ pollId }: { pollId: string }) {
  const queryClient = useQueryClient()

  const [toastOpen, setToastOpen] = useState(false)

  const pollQuery = useQuery({
    queryKey: queryKeys.poll(pollId),
    queryFn: () => fetchPollDetails(pollId),
    enabled: Boolean(pollId),
    refetchInterval: 5000,
  })

  const resultsQuery = useQuery({
    queryKey: queryKeys.pollResults(pollId),
    queryFn: () => fetchPollResults(pollId),
    enabled: Boolean(pollId),
    refetchInterval: 5000,
  })

  usePollResultsStream(pollId)

  const voteMutation = useMutation({
    mutationFn: (optionId: number) => castVote(pollId, optionId),

    onSuccess: async ({ optionId }) => {
      const key = queryKeys.pollResults(pollId)
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<PollResults>(key, (current) => ({
        pollId: Number(pollId),
        phase: current?.phase ?? pollQuery.data!.phase,
        participantCount: current?.participantCount ?? 0,
        ...current,
        voted: true,
        myOptionId: optionId,
      }))
      setToastOpen(true)
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  if (pollQuery.isPending) {
    return (
      <Box
        component="main"
        sx={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 22px 60px',
        }}
      >
        <PageStatus>투표를 불러오는 중입니다.</PageStatus>
      </Box>
    )
  }

  if (pollQuery.isError) {
    return (
      <Box
        component="main"
        sx={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 22px 60px',
        }}
      >
        <PageStatus>{pollQuery.error.message}</PageStatus>
      </Box>
    )
  }

  const rankOf = createRankLookup(resultsQuery.data?.results, pollQuery.data.options)
  const showRanks = canShowRanks(resultsQuery.data)
  const myOptionId = resultsQuery.data?.myOptionId

  const isVotingOpen =
    pollQuery.data.phase === 'LIVE_VISIBLE' ||
    pollQuery.data.phase === 'RESULTS_HIDDEN'

  const displayStatus = effectiveStatus(
    pollQuery.data.status,
    pollQuery.data.endsAt,
  )


  return (
    <Box
      component="main"
      sx={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '16px 22px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <BackLink to="/">목록으로</BackLink>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          gap: '16px',
        }}
      >
        <Box
          sx={{
            flex: '1 1 640px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <PollHero
            status={displayStatus}
            endsAt={pollQuery.data.endsAt}
            participantCount={resultsQuery.data?.participantCount ?? 0}
            voted={Boolean(resultsQuery.data?.voted)}
          />

          <VoteNotice
            state={voteMutation.isError ? 'error' : voteMutation.isSuccess ? 'success' : 'idle'}
            errorMessage={voteMutation.error?.message}
          />

          <RankingsPanel
            options={pollQuery.data.options}
            data={resultsQuery.data}
          />

          <CandidateSection
            pollOptions={pollQuery.data.options}
            rankOf={rankOf}
            showRanks={showRanks}
            myOptionId={myOptionId}
            disabled={!isVotingOpen || voteMutation.isPending}
            onVote={(optionId) => voteMutation.mutate(optionId)}
          />
        </Box>

        <ResultsSidebar
          options={pollQuery.data.options}
          data={resultsQuery.data}
        />
      </Box>

      <Snackbar
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        autoHideDuration={2600}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        message={
          <Stack>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              투표가 저장됐습니다.
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: 'rgba(255,255,255,.62)',
              }}
            >
              마감 전까지 다른 후보로 재투표할 수 있습니다.
            </Typography>
          </Stack>
        }
        sx={{
          '& .MuiSnackbarContent-root': {
            background: tokens.color.textPrimary,
            borderRadius: `${tokens.radius.sm}px`,
          },
        }}
      />
    </Box>
  )
}
