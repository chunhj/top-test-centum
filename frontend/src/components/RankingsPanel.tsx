import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'
import type { PollOption, PollResults } from '../pollApi'

const RANK_LABEL = (index: number) => (index === 0 ? '🏆 1위' : `${index + 1}위`)

export function RankingsPanel({ options, data }: { options: PollOption[]; data?: PollResults }) {
  const rows = data?.results?.map((result) => ({ ...result, option: options.find((option) => option.optionId === result.optionId)! })) ?? []
  const hidden = data?.phase === 'RESULTS_HIDDEN'

  return (
    <Box
      component="section"
      sx={{
        background: tokens.color.surface,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: `${tokens.radius.md}px`,
        padding: '24px 26px 26px',
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: tokens.color.textPrimary }}>
            현재 랭킹 TOP 3
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: tokens.color.textFaint, marginTop: '6px' }}>
            {rows.length ? 'SSE로 갱신되는 상위 3명입니다.' : '투표 완료자에게 공개'}
          </Typography>
        </Box>
        <Chip
          label={rows.length ? '실시간' : '잠금'}
          sx={{ background: tokens.color.accentSoftBg, color: tokens.color.accentSoftText, fontSize: 11, height: 28 }}
        />
      </Stack>

      {rows.length ? (
        <Box
          sx={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: '16px',
          }}
        >
          {rows.slice(0, 3).map(({ option, voteCount }, index) => (
            <Box
              key={option.optionId}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                padding: '16px',
                borderRadius: `${tokens.radius.md}px`,
                border: `1px solid ${index === 0 ? '#C7E0D8' : tokens.color.border}`,
                background: index === 0 ? '#F3F8F6' : tokens.color.surface,
              }}
            >
              <Box
                sx={{
                  flex: 'none',
                  width: 74,
                  height: 86,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundImage: 'repeating-linear-gradient(135deg, #EFEFEA 0 8px, #F7F7F3 8px 16px)',
                }}
              >
                {option.imageUrl && (
                  <Box component="img" src={option.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </Box>
              <Box sx={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.color.textMuted }}>{RANK_LABEL(index)}</Typography>
                <Typography sx={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>{option.name}</Typography>
                {option.team && <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: tokens.color.textFaint }}>{option.team}</Typography>}
                <Typography sx={{ fontFamily: tokens.fontFamily.display, fontSize: 13, fontWeight: 700, color: tokens.color.textPrimary, marginTop: '4px' }}>
                  {voteCount.toLocaleString()}표
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            marginTop: '18px',
            padding: '24px',
            borderRadius: `${tokens.radius.md}px`,
            border: `1px dashed ${tokens.color.borderStrong}`,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: tokens.color.textPrimary }}>
            {hidden ? '집계 중입니다' : '순위 집계 비공개'}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: tokens.color.textFaint, marginTop: '4px' }}>
            {hidden ? '마감 후 최종 결과를 확인할 수 있습니다.' : '투표 후 확인할 수 있습니다.'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
