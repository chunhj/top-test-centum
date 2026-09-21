import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'
import type { PollOption, PollResults } from '../pollApi'

export function ResultsSidebar({ options, data }: { options: PollOption[]; data?: PollResults }) {
  const rows = data?.results?.map((result) => ({ ...result, option: options.find((option) => option.optionId === result.optionId)! })) ?? []
  const hidden = data?.phase === 'RESULTS_HIDDEN'

  return (
    <Box
      component="aside"
      aria-label="투표 결과"
      sx={{
        flex: '1 1 280px',
        width: { xs: '100%', md: 'auto' },
        minWidth: 260,
        maxWidth: { xs: '100%', md: 320 },
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: { md: 'sticky' },
        top: { md: 84 },
        alignSelf: { xs: 'stretch', md: 'flex-start' },
      }}
    >
      <Box
        component="section"
        sx={{
          background: tokens.color.surface,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: `${tokens.radius.md}px`,
          padding: '18px 18px 14px',
        }}
      >
        <Typography component="h3" sx={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
          실시간 투표 현황
        </Typography>
        <Typography sx={{ margin: '6px 0 12px', fontSize: 11.5, fontWeight: 500, color: tokens.color.textFaint }}>
          투표 완료 후 확인 가능
        </Typography>

        {rows.length ? (
          <Stack spacing={1.1}>
            {rows.map(({ option, voteCount, percentage }, index) => (
              <Box key={option.optionId} sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Typography
                  sx={{
                    flex: 'none',
                    width: 12,
                    textAlign: 'center',
                    fontFamily: tokens.fontFamily.display,
                    fontSize: 12,
                    fontWeight: 700,
                    color: index === 0 ? tokens.color.accent : index === 1 ? tokens.color.textSecondary : tokens.color.textMuted,
                  }}
                >
                  {index + 1}
                </Typography>
                <Box
                  sx={{
                    flex: 'none',
                    width: 22,
                    height: 22,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundImage: 'repeating-linear-gradient(135deg, #EFEFEA 0 6px, #F7F7F3 6px 12px)',
                  }}
                >
                  {option.imageUrl && (
                    <Box component="img" src={option.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: tokens.color.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {option.name}
                    </Typography>
                    <Typography sx={{ fontFamily: tokens.fontFamily.display, fontSize: 10.5, fontWeight: 600, color: tokens.color.textMuted, whiteSpace: 'nowrap' }}>
                      {percentage}% · {voteCount.toLocaleString()}표
                    </Typography>
                  </Stack>
                  <Box sx={{ display: 'block', height: 5, borderRadius: `${tokens.radius.pill}px`, background: '#EFF0EC', overflow: 'hidden' }}>
                    <Box sx={{ display: 'block', height: '100%', borderRadius: `${tokens.radius.pill}px`, background: tokens.color.accent, width: `${Math.max(percentage, 7)}%` }} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ padding: '10px 12px', border: `1px dashed ${tokens.color.borderStrong}`, borderRadius: `${tokens.radius.sm}px` }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.textPrimary }}>
              {hidden ? '마감 30분 전 집계 비공개' : '투표 후 확인 가능'}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: tokens.color.textFaint, marginTop: '2px' }}>아직 공개된 결과가 없습니다.</Typography>
          </Box>
        )}
      </Box>

      <Box
        component="section"
        sx={{
          background: tokens.color.surface,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: `${tokens.radius.md}px`,
          padding: '18px',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.1}>
          <Box sx={{ width: 24, height: 24, borderRadius: '7px', background: tokens.color.surfaceMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            💗
          </Box>
          <Typography component="h3" sx={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
            마감 정책
          </Typography>
        </Stack>
        <Stack spacing={1.25} sx={{ marginTop: '14px' }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, color: tokens.color.textTertiary }}>
            <Box component="strong" sx={{ color: tokens.color.textPrimary, fontWeight: 800 }}>T-30</Box>부터 숫자 결과를 전송하지 않습니다.
          </Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, color: tokens.color.textTertiary }}>
            <Box component="strong" sx={{ color: tokens.color.textPrimary, fontWeight: 800 }}>재투표</Box>는 한 트랜잭션으로 처리합니다.
          </Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, color: tokens.color.textTertiary }}>
            <Box component="strong" sx={{ color: tokens.color.textPrimary, fontWeight: 800 }}>마감 후</Box> 투표를 차단하고 최종 결과를 공개합니다.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
