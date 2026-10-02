import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'
import type { PollOption } from '../api/pollApi'

export function CandidateCard({ option, rank, selected, disabled, onVote }: {
  option: PollOption; rank?: number; selected: boolean; disabled: boolean; onVote: () => void
}) {
  return (
    <Box
      component="article"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 8px 10px',
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${selected ? tokens.color.highlightBorder : tokens.color.border}`,
        background: selected ? tokens.color.highlightBg : tokens.color.surface,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(20,23,26,.12)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 126,
          borderRadius: `${tokens.radius.sm + 1}px`,
          overflow: 'hidden',
          backgroundImage:
            `repeating-linear-gradient(135deg, ${tokens.color.placeholderStripe} 0 8px, ${tokens.color.placeholderStripeAlt} 8px 16px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {option.imageUrl ? (
          <Box component="img" src={option.imageUrl} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography aria-hidden sx={{ fontSize: 28, fontWeight: 800, color: tokens.color.textFaint }}>
            {option.name.charAt(0)}
          </Typography>
        )}
        {/* Rank badge is omitted when the page decides ranks must not be shown. */}
        {rank !== undefined && (
          <Box
            sx={{
              position: 'absolute',
              top: 7,
              left: 7,
              width: 22,
              height: 22,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: tokens.fontFamily.display,
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              background:
                rank === 1 ? '#D4AF37' // gold
                : rank === 2 ? '#A7A9AC' // silver
                : rank === 3 ? '#CD7F32' // bronze
                : 'rgba(20,23,26,.62)',
            }}
          >
            {rank}
          </Box>
        )}
        {selected && (
          <Box
            sx={{
              position: 'absolute',
              top: 7,
              right: 7,
              background: tokens.color.accent,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✓ 내 투표
          </Box>
        )}
      </Box>
      <Typography sx={{ marginTop: '10px', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
        {option.name}
      </Typography>
      {option.team && (
        <Typography sx={{ marginTop: '4px', fontSize: 11, fontWeight: 700, color: tokens.color.accent }}>
          {option.team}
        </Typography>
      )}
      <Button
        type="button"
        onClick={onVote}
        disabled={disabled}
        aria-pressed={selected}
        sx={{
          marginTop: '10px',
          borderRadius: `${tokens.radius.sm}px`,
          padding: '9px 10px',
          fontSize: 12,
          fontWeight: 800,
          background: selected ? tokens.color.accent : tokens.color.ctaBg,
          color: selected ? '#FFFFFF' : tokens.color.ctaTextStrong,
          '&:hover': { background: selected ? tokens.color.accentDark : tokens.color.ctaBg },
          '&.Mui-disabled': {
            background: selected ? tokens.color.accent : tokens.color.ctaBg,
            color: selected ? '#FFFFFF' : tokens.color.ctaTextStrong,
            opacity: 0.6,
          },
        }}
      >
        {selected ? '내 투표 · 변경' : '투표하기'}
      </Button>
    </Box>
  )
}
