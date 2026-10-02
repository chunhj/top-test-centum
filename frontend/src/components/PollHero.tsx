import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CountdownBoxes } from './Countdown'
import { statusLabel, statusTone } from '../lib/format'
import { POLL_HERO_IMAGE_URL } from '../lib/images'
import type { PollStatus } from '../api/pollApi'
import { tokens } from '../theme'

/** Top hero of the poll detail page (status badge, headline, countdown, participant count). */
export function PollHero({ status, endsAt, participantCount, voted }: {
  status: PollStatus
  endsAt: string
  participantCount: number
  voted: boolean
}) {
  const tone = statusTone[status]

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${tokens.radius.md}px`,
        minHeight: 'min(58vh, 460px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 'clamp(24px, 3.5vw, 40px)',
        backgroundImage: `linear-gradient(
          to top,
          rgba(8,10,11,.94) 0%,
          rgba(8,10,11,.82) 38%,
          rgba(8,10,11,.42) 72%,
          rgba(8,10,11,.2) 100%
        ), url(${POLL_HERO_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: tokens.color.heroBg,
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          right: 'clamp(24px, 3.5vw, 40px)',
          bottom: 'clamp(24px, 3.5vw, 40px)',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'rgba(255,255,255,.28)',
          textAlign: 'right',
          userSelect: 'none',
        }}
      >
        More
        <br />
        Brighter
        <br />
        Tomorrow
      </Typography>

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',

          // 중요:
          // 기존 maxWidth: 660 제거
          // 메인 박스 전체 폭을 사용
          width: '100%',
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          flexWrap="wrap"
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: `${tokens.radius.pill}px`,
              background: tone.background,
              color: tone.color,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            {statusLabel[status]}
          </Box>

          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            제 3회 TOP 글로벌 인기 투표
          </Typography>
        </Stack>

        <Typography
          component="h1"
          sx={{
            margin: 0,
            fontSize: 'clamp(28px, 4.2vw, 46px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.2,
            color: '#FFFFFF',
            wordBreak: 'keep-all',
          }}
        >
          오늘, 당신의 한 표가
          <br />

          <Box
            component="em"
            sx={{
              fontStyle: 'normal',
              color: tokens.color.countdownDigit,
            }}
          >
            최애의 순간
          </Box>
          을
          <br />
          더 빛나게 합니다.
        </Typography>

        <Typography
          sx={{
            fontSize: 14,
            color: 'rgba(255,255,255,.8)',
          }}
        >
          TOP과 함께, 더 반짝이는 오늘의 선택을 만들어주세요.
        </Typography>

        {/* 시간 / 참여자 */}
        <Stack
          direction="row"
          alignItems="flex-end"
          justifyContent="space-between"
          sx={{
            width: '100%',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,.14)',
          }}
        >
          {/* 왼쪽 */}
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,.58)',
                marginBottom: '10px',
              }}
            >
              투표 종료까지
            </Typography>

            <CountdownBoxes endsAt={endsAt} />
          </Box>

          {/* 오른쪽 끝 */}
          <Box
            sx={{
              marginLeft: 'auto',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,.58)',
                marginBottom: '10px',
                marginRight: '25px'
              }}
            >
              참여자
            </Typography>

            <Stack
              direction="row"
              alignItems="baseline"
              justifyContent="flex-end"
              spacing={0.75}
            >
              <Typography
                sx={{
                  fontFamily: tokens.fontFamily.display,
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  fontWeight: 600,
                  lineHeight: 1,
                  color: '#FFFFFF',
                }}
              >
                {(
                  participantCount
                ).toLocaleString()}
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,.62)',
                }}
              >
                명
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack
          spacing={0.5}
          sx={{
            paddingBottom: '6px',
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,.72)',
            }}
          >
            {voted
              ? '재투표 직후 실시간 집계에 반영됩니다.'
              : '투표 완료 후 실시간 순위와 득표율을 확인할 수 있습니다.'}
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,.72)',
            }}
          >
            한 명을 선택하면 즉시 투표가 저장됩니다.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
