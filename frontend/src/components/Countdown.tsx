import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'

function useCountdownParts(endsAt: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000))
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    hh: pad(Math.floor(seconds / 3600)),
    mm: pad(Math.floor(seconds / 60) % 60),
    ss: pad(seconds % 60),
    seconds,
  }
}

const UNIT_LABEL = { hh: '시간', mm: '분', ss: '초' } as const

/** Boxed hh/mm/ss digit groups, matching the `ui/` hero countdown design. */
export function CountdownBoxes({ endsAt }: { endsAt: string }) {
  const parts = useCountdownParts(endsAt)
  return (
    <Stack direction="row" spacing={0.75} alignItems="stretch">
      {(['hh', 'mm', 'ss'] as const).map((key, index) => (
        <Box key={key} sx={{ display: 'flex', alignItems: 'stretch', gap: 0.75 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.25,
              padding: '8px 12px',
              borderRadius: `${tokens.radius.sm}px`,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.fontFamily.display,
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 700,
                lineHeight: 1,
                color: tokens.color.countdownDigit,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {parts[key]}
            </Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
              {UNIT_LABEL[key]}
            </Typography>
          </Box>
          {index < 2 && (
            <Typography
              sx={{
                alignSelf: 'center',
                fontFamily: tokens.fontFamily.display,
                fontSize: 20,
                color: 'rgba(255,255,255,0.3)',
                marginBottom: '8px',
              }}
            >
              :
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  )
}
