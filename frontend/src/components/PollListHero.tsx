import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { PollListItem } from '../api/pollApi'
import { CountdownBoxes } from './Countdown'
import { effectiveStatus, statusLabel } from '../lib/format'
import { POLL_HERO_IMAGE_URL } from '../lib/images'
import { tokens } from '../theme'

/** Featured poll banner at the top of the poll list (status, title, countdown, participants, CTA). */
export function PollListHero({ heroPoll, now }: { heroPoll: PollListItem; now: number }) {
  return (
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
            `url(${POLL_HERO_IMAGE_URL})`,
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
          label={statusLabel[effectiveStatus(heroPoll.status, heroPoll.endsAt, now)]}
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
                {heroPoll.participantCount.toLocaleString()}
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
  )
}
