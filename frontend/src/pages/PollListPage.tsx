import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import GroupIcon from '@mui/icons-material/PeopleAltOutlined'
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined'
import { fetchOpenPolls, fetchPollResults, type PollSummary } from '../pollApi'
import { PageStatus } from '../components/PageStatus'
import { CountdownBoxes } from '../components/Countdown'
import { statusLabel, statusTone, formatDateTime, formatRemaining } from '../lib/format'
import { tokens } from '../theme'

type SortKey = 'latest' | 'closing'

export function PollListPage() {
  const pollsQuery = useQuery({ queryKey: ['polls'], queryFn: fetchOpenPolls })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('latest')

  const polls = pollsQuery.data ?? []
  const heroPoll = useMemo(() => polls.find((poll) => poll.status === 'OPEN') ?? polls[0], [polls])

  const heroResultsQuery = useQuery({
    queryKey: ['poll-results', heroPoll?.pollId],
    queryFn: () => fetchPollResults(String(heroPoll!.pollId)),
    enabled: Boolean(heroPoll),
  })

  const closingSoon = useMemo(
    () =>
      polls
        .filter((poll) => poll.status === 'OPEN')
        .slice()
        .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
        .slice(0, 3),
    [polls],
  )

  const filteredPolls = useMemo(() => {
    const q = query.trim()
    const list = q ? polls.filter((poll) => poll.title.includes(q)) : polls.slice()
    return list.sort((a, b) =>
      sort === 'closing'
        ? new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        // 최신순: 생성 순서를 그대로 반영하는 pollId 내림차순 (가장 최근에 만든 투표가 맨 앞/좌측).
        : b.pollId - a.pollId,
    )
  }, [polls, query, sort])

  return (
    <Box component="main" sx={{ maxWidth: 1240, margin: '0 auto', padding: '16px 22px 60px' }}>
      <Box component="section" sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        {heroPoll && (
          <Box
            sx={{
              flex: '1 1 580px',
              minWidth: 0,
              position: 'relative',
              borderRadius: `${tokens.radius.md}px`,
              overflow: 'hidden',
              background: tokens.color.heroBg,
              minHeight: 'min(58vh, 460px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 'clamp(24px, 3.5vw, 40px)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'url(https://mblogthumb-phinf.pstatic.net/MjAyMzAxMjZfMjkz/MDAxNjc0NjkxNzQyOTI1.TtjvH5ul64-AXLcFUvn93hMSFsn6yZjrpxmClxJpZicg.Ee_Q-Cf406S7z8OapQLbyf3hTxCQqYL8axu93__NPusg.JPEG.seoulworkshop/TheFirstSlamDunk_Team_Group.jpg?type=w800)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(8,10,11,.94) 0%, rgba(8,10,11,.82) 38%, rgba(8,10,11,.42) 72%, rgba(8,10,11,.2) 100%)',
              }}
            />
            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 660, minWidth: 0 }}>
              <Chip
                label={statusLabel[heroPoll.status]}
                sx={{
                  alignSelf: 'flex-start',
                  background: tokens.color.ctaBg,
                  color: tokens.color.ctaText,
                  fontSize: 12,
                }}
              />
              <Typography
                component={RouterLink}
                to={`/polls/${heroPoll.pollId}`}
                sx={{
                  margin: 0,
                  fontSize: 'clamp(28px, 4.2vw, 46px)',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.2,
                  color: '#FFFFFF',
                  maxWidth: '19ch',
                  wordBreak: 'keep-all',
                  textDecoration: 'none',
                }}
              >
                {heroPoll.title}
              </Typography>
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="flex-end"
                spacing={{ xs: 2, sm: 4 }}
                sx={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,.14)' }}
              >
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,.58)', marginBottom: '10px' }}>
                    투표 종료까지
                  </Typography>
                  <CountdownBoxes endsAt={heroPoll.endsAt} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,.58)', marginBottom: '10px' }}>
                    지금까지의 참여자
                  </Typography>
                  <Stack direction="row" alignItems="baseline" spacing={0.75}>
                    <Typography sx={{ fontFamily: tokens.fontFamily.display, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, lineHeight: 1, color: '#FFFFFF' }}>
                      {(heroResultsQuery.data?.participantCount ?? 0).toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.62)' }}>명</Typography>
                  </Stack>
                </Box>
              </Stack>
              <Button
                component={RouterLink}
                to={`/polls/${heroPoll.pollId}`}
                sx={{
                  alignSelf: 'flex-start',
                  background: tokens.color.ctaBg,
                  color: tokens.color.ctaText,
                  padding: '15px 26px',
                  fontSize: 15.5,
                  '&:hover': { background: tokens.color.ctaBg, opacity: 0.92 },
                }}
              >
                지금 투표하기 →
              </Button>
            </Box>
          </Box>
        )}


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
            <PollCard key={poll.pollId} poll={poll} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

const ROSTER_IMAGE_URLS = [
  'https://slamdunk-movie.jp/files/images/p_main_sakuragi.jpg',
  'https://slamdunk-movie.jp/files/images/p_main_rukawa.jpg',
  'https://slamdunk-movie.jp/files/images/p_main_mitsui.jpg',
  'https://slamdunk-movie.jp/files/images/p_main_miyagi.jpg',
  'https://slamdunk-movie.jp/files/images/p_main_akagi.jpg',
  'https://renote.net/files/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ODUzMjY1NCwicHVyIjoiYmxvYl9pZCJ9fQ%3D%3D--926f4d837d7892c0f331deaaedf71f1bebaa237a/l1029639668.jpg',
  'https://i.pinimg.com/736x/a1/69/eb/a169eb6c223678470a15fe3e5421dd70--manga-games-kuroko.jpg',
  'https://img.online-station.net/image_content/2023/01/Kogure-Kiminobu-600x600.jpg',
]

function rosterImageForPoll(pollId: number): string {
  const index = (pollId - 1) % ROSTER_IMAGE_URLS.length
  return ROSTER_IMAGE_URLS[index < 0 ? index + ROSTER_IMAGE_URLS.length : index]
}

function PollCard({ poll }: { poll: PollSummary }) {
  const tone = statusTone[poll.status]
  const resultsQuery = useQuery({
    queryKey: ['poll-results', poll.pollId],
    queryFn: () => fetchPollResults(String(poll.pollId)),
  })
  // 카드 썸네일은 각 투표의 실제 후보 데이터가 아니라, 고정된 8명 로스터를
  // "투표 생성 순서"대로 한 명씩 순환 배정한다 (1번째 투표 → 1번 멤버, 2번째 투표 → 2번 멤버, ...,
  // 9번째 투표는 다시 1번 멤버). 단순 시각적 재미를 위한 장치이며 poll_option 데이터와는 무관하다.
  const cardImageUrl = rosterImageForPoll(poll.pollId)
  return (
    <Box
      component={RouterLink}
      to={`/polls/${poll.pollId}`}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: tokens.color.surface,
        overflow: 'hidden',
        border: `1px solid ${tokens.color.border}`,
        borderRadius: `${tokens.radius.md}px`,
        textDecoration: 'none',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          aspectRatio: '16 / 10',
          backgroundImage: `url(${cardImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10,
          color: tokens.color.textFaint,
        }}
      >
        <Chip
          label={statusLabel[poll.status]}
          size="small"
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 11.5,
            fontWeight: 700,
            background: tone.background,
            color: tone.color,
            boxShadow: '0 1px 2px rgba(20,23,26,.08)',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, padding: '16px 16px 0' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.025em', color: tokens.color.textPrimary, lineHeight: 1.4, wordBreak: 'keep-all' }}>
          {poll.title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: tokens.color.textTertiary, lineHeight: 1.5, wordBreak: 'keep-all' }}>
          {formatDateTime(poll.startsAt)} — {formatDateTime(poll.endsAt)}
        </Typography>
      </Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ padding: '12px 16px 14px', marginTop: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={0.6}>
          <GroupIcon sx={{ fontSize: 15, color: tokens.color.textTertiary }} />
          <Typography sx={{ fontFamily: tokens.fontFamily.display, fontSize: 13, fontWeight: 600, color: tokens.color.textPrimary }}>
            {(resultsQuery.data?.participantCount ?? 0).toLocaleString()}명 참여
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <ScheduleIcon sx={{ fontSize: 13, color: tokens.color.accent }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.accent }}>{formatRemaining(poll.endsAt)}</Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
