import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { fetchOpenPolls } from '../api/pollApi'
import { PageStatus } from '../components/PageStatus'
import { PollCard } from '../components/PollCard'
import { PollListHero } from '../components/PollListHero'
import { effectiveStatus } from '../lib/format'
import { tokens } from '../theme'
import { queryKeys } from '../lib/queryKeys'
import { useNow } from '../hooks/useNow'

export function PollListPage() {
  const pollsQuery = useQuery({ queryKey: queryKeys.polls(), queryFn: fetchOpenPolls })

  const polls = useMemo(() => pollsQuery.data ?? [], [pollsQuery.data])
  // Ticks every 10 seconds so "N분 남음" and the ended→마감 badge follow the clock within ~10s.
  // Only re-renders the list; no extra requests.
  const now = useNow(10_000)
  const heroPoll = useMemo(() => polls.find((poll) => effectiveStatus(poll.status, poll.endsAt, now) === 'OPEN') ?? polls[0], [polls, now])

  const filteredPolls = useMemo(() => polls.slice().sort((a, b) => b.pollId - a.pollId), [polls])

  return (
    <Box component="main" sx={{ maxWidth: 1240, margin: '0 auto', padding: '16px 22px 60px' }}>
      <Box component="section" sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        {heroPoll && <PollListHero heroPoll={heroPoll} now={now} />}


      </Box>

      <Box component="section" id="poll-list" sx={{ marginTop: 'clamp(40px, 6vw, 72px)' }}>
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          justifyContent="space-between"
          spacing={{ xs: 2, sm: 4 }}
          sx={{ paddingBottom: '20px' }}
        >
          <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
            <Typography component="h2" sx={{ margin: '0 0 6px', fontSize: 'clamp(21px, 2.7vw, 27px)', fontWeight: 800, letterSpacing: '-0.025em', color: tokens.color.textPrimary, wordBreak: 'keep-all' }}>
              지금, 당신의 최애는 누구인가요?
            </Typography>
          </Box>

        </Stack>

        <Box sx={{ height: 20 }} />

        {pollsQuery.isPending && <PageStatus>투표 목록을 불러오는 중입니다.</PageStatus>}
        {pollsQuery.isError && <PageStatus>{pollsQuery.error.message}</PageStatus>}
        {pollsQuery.isSuccess && filteredPolls.length === 0 && <PageStatus>표시할 투표가 없습니다.</PageStatus>}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
            gap: 'clamp(12px, 1.5vw, 20px)',
            alignItems: 'start',
          }}
        >
          {filteredPolls.map((poll) => (
            <PollCard key={poll.pollId} poll={poll} now={now} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}
