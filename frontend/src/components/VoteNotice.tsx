import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'

export type VoteNoticeState = 'idle' | 'success' | 'error'

/** Status banner above the rankings: pre-vote guidance, save confirmation, or the vote error. */
export function VoteNotice({ state, errorMessage }: { state: VoteNoticeState; errorMessage?: string }) {
  // On failure only the error message is shown; the pre-vote title no longer fits.
  const noticeTitle = state === 'error'
    ? undefined
    : state === 'success'
      ? '내 투표가 저장되었습니다.'
      : '투표 전에는 집계 결과를 공개하지 않습니다.'

  const noticeText = state === 'error'
    ? errorMessage
    : state === 'success'
      ? '마감 전까지 다른 후보로 재투표할 수 있습니다.'
      : '후보를 선택하면 서버 저장 성공 후 결과 영역이 열립니다.'

  return (
    <Alert
      role="status"
      severity={
        state === 'error'
          ? 'error'
          : state === 'success'
            ? 'success'
            : 'info'
      }
      icon={
        <Box
          component="span"
          sx={{
            fontSize: 14,
          }}
        >
          ✓
        </Box>
      }
      sx={{
        borderRadius: `${tokens.radius.sm}px`,
        alignItems: 'center',
      }}
    >
      {noticeTitle && (
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          {noticeTitle}
        </Typography>
      )}

      <Typography
        sx={{
          fontSize: 12.5,
        }}
      >
        {noticeText}
      </Typography>
    </Alert>
  )
}
