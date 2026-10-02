import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import GroupIcon from '@mui/icons-material/PeopleAltOutlined'
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined'
import type { PollListItem } from '../api/pollApi'
import { effectiveStatus, statusLabel, statusTone, formatDateTime, formatRemaining } from '../lib/format'
import { ROSTER_IMAGE_URLS } from '../lib/images'
import { tokens } from '../theme'
function rosterImageForPoll(pollId: number): string {
  const index = (pollId - 1) % ROSTER_IMAGE_URLS.length
  return ROSTER_IMAGE_URLS[index < 0 ? index + ROSTER_IMAGE_URLS.length : index]
}

export function PollCard({ poll, now }: { poll: PollListItem; now: number }) {
  const displayStatus = effectiveStatus(poll.status, poll.endsAt, now)
  const tone = statusTone[displayStatus]
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
          label={statusLabel[displayStatus]}
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
            {poll.participantCount.toLocaleString()}명 참여
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <ScheduleIcon sx={{ fontSize: 13, color: tokens.color.accent }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.accent }}>{formatRemaining(poll.endsAt, now)}</Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
