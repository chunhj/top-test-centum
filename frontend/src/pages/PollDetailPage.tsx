import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { castVote, fetchPollDetails, fetchPollResults } from '../pollApi'
import { CountdownBoxes } from '../components/Countdown'
import { PageStatus } from '../components/PageStatus'
import { CandidateCard } from '../components/CandidateCard'
import { RankingsPanel } from '../components/RankingsPanel'
import { ResultsSidebar } from '../components/ResultsSidebar'
import { effectiveStatus, statusLabel, statusTone } from '../lib/format'
import { tokens } from '../theme'

const POLL_HERO_IMAGE_URL =
  'https://mblogthumb-phinf.pstatic.net/MjAyMzAxMjZfMjkz/MDAxNjc0NjkxNzQyOTI1.TtjvH5ul64-AXLcFUvn93hMSFsn6yZjrpxmClxJpZicg.Ee_Q-Cf406S7z8OapQLbyf3hTxCQqYL8axu93__NPusg.JPEG.seoulworkshop/TheFirstSlamDunk_Team_Group.jpg?type=w800'

export function PollDetailPage() {
  const { pollId = '' } = useParams()
  const queryClient = useQueryClient()

  const [sortOrder, setSortOrder] = useState<'rank' | 'name'>('rank')
  const [selectedOptionId, setSelectedOptionId] = useState<number>()
  const [toastOpen, setToastOpen] = useState(false)

  const pollQuery = useQuery({
    queryKey: ['poll', pollId],
    queryFn: () => fetchPollDetails(pollId),
    enabled: Boolean(pollId),
    refetchInterval: 5000,
  })

  const resultsQuery = useQuery({
    queryKey: ['poll-results', pollId],
    queryFn: () => fetchPollResults(pollId),
    enabled: Boolean(pollId),
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (!pollId) return

    const stream = new EventSource(`/api/polls/${pollId}/stream`)

    stream.addEventListener('vote-result', () =>
      queryClient.invalidateQueries({
        queryKey: ['poll-results', pollId],
      }),
    )

    stream.addEventListener('phase-changed', () =>
      queryClient.invalidateQueries({
        queryKey: ['poll-results', pollId],
      }),
    )

    return () => stream.close()
  }, [pollId, queryClient])

  const voteMutation = useMutation({
    mutationFn: (optionId: number) => castVote(pollId, optionId),

    onSuccess: ({ optionId }) => {
      setSelectedOptionId(optionId)
      setToastOpen(true)

      queryClient.invalidateQueries({
        queryKey: ['poll-results', pollId],
      })
    },
  })

  if (pollQuery.isPending) {
    return (
      <Box
        component="main"
        sx={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 22px 60px',
        }}
      >
        <PageStatus>투표를 불러오는 중입니다.</PageStatus>
      </Box>
    )
  }

  if (pollQuery.isError) {
    return (
      <Box
        component="main"
        sx={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 22px 60px',
        }}
      >
        <PageStatus>{pollQuery.error.message}</PageStatus>
      </Box>
    )
  }

  const rankByOptionId = new Map(
    (resultsQuery.data?.results ?? pollQuery.data.options).map(
      (item, index) => [item.optionId, index + 1],
    ),
  )

  const options = [...pollQuery.data.options].sort((a, b) =>
    sortOrder === 'name'
      ? a.name.localeCompare(b.name, 'ko')
      : rankByOptionId.get(a.optionId)! - rankByOptionId.get(b.optionId)!,
  )

  const isVotingOpen =
    pollQuery.data.phase === 'LIVE_VISIBLE' ||
    pollQuery.data.phase === 'RESULTS_HIDDEN'

  const noticeTitle = voteMutation.isSuccess
    ? '내 투표가 저장되었습니다.'
    : '투표 전에는 집계 결과를 공개하지 않습니다.'

  const noticeText = voteMutation.isError
    ? voteMutation.error.message
    : voteMutation.isSuccess
      ? '마감 전까지 다른 후보로 재투표할 수 있습니다.'
      : '후보를 선택하면 서버 저장 성공 후 결과 영역이 열립니다.'

  const displayStatus = effectiveStatus(
    pollQuery.data.status,
    pollQuery.data.endsAt,
  )

  const tone = statusTone[displayStatus]

  return (
    <Box
      component="main"
      sx={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '16px 22px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <Box
        component={Link}
        to="/"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px 8px 10px',
          marginLeft: '-10px',
          borderRadius: `${tokens.radius.sm}px`,
          fontSize: 13,
          fontWeight: 600,
          color: tokens.color.textSecondary,
          textDecoration: 'none',
          width: 'fit-content',
          '&:hover': {
            background: tokens.color.surfaceMuted,
            color: tokens.color.textPrimary,
          },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 15 }} />
        목록으로
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          gap: '16px',
        }}
      >
        <Box
          sx={{
            flex: '1 1 640px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
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
                  {statusLabel[displayStatus]}
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

                  <CountdownBoxes endsAt={pollQuery.data.endsAt} />
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
                        resultsQuery.data?.participantCount ?? 0
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
                  {resultsQuery.data?.voted
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

          <Alert
            role="status"
            severity={
              voteMutation.isError
                ? 'error'
                : voteMutation.isSuccess
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
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              {noticeTitle}
            </Typography>

            <Typography
              sx={{
                fontSize: 12.5,
              }}
            >
              {noticeText}
            </Typography>
          </Alert>

          <RankingsPanel
            options={pollQuery.data.options}
            data={resultsQuery.data}
          />

          <Box
            component="section"
            aria-labelledby="candidate-title"
            sx={{
              background: tokens.color.surface,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: `${tokens.radius.md}px`,
              padding: '24px 26px 28px',
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={2}
              flexWrap="wrap"
            >
              <Box>
                <Typography
                  component="h2"
                  id="candidate-title"
                  sx={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: tokens.color.textPrimary,
                  }}
                >
                  참여 멤버{' '}

                  <Box
                    component="b"
                    sx={{
                      color: tokens.color.accent,
                    }}
                  >
                    {options.length}
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    fontWeight: 500,
                    color: tokens.color.textFaint,
                  }}
                >
                  당신의 마음을 움직인 한 명에게 투표하세요.
                </Typography>
              </Box>

              <FormControl size="small">
                <Select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as 'rank' | 'name')
                  }
                  aria-label="후보 정렬"
                  sx={{
                    borderRadius: `${tokens.radius.pill}px`,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <MenuItem value="rank">최근 인기순</MenuItem>
                  <MenuItem value="name">이름순</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {options.length === 0 ? (
              <Box
                sx={{
                  marginTop: '18px',
                }}
              >
                <PageStatus>등록된 후보가 없습니다.</PageStatus>
              </Box>
            ) : (
              <Box
                sx={{
                  marginTop: '18px',
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(158px, 1fr))',
                  gap: '14px',
                }}
              >
                {options.map((option) => (
                  <CandidateCard
                    key={option.optionId}
                    option={option}
                    rank={rankByOptionId.get(option.optionId)!}
                    selected={selectedOptionId === option.optionId}
                    disabled={!isVotingOpen || voteMutation.isPending}
                    onVote={() => voteMutation.mutate(option.optionId)}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>

        <ResultsSidebar
          options={pollQuery.data.options}
          data={resultsQuery.data}
        />
      </Box>

      <Snackbar
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        autoHideDuration={2600}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        message={
          <Stack>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              투표가 저장됐습니다.
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: 'rgba(255,255,255,.62)',
              }}
            >
              마감 전까지 다른 후보로 재투표할 수 있습니다.
            </Typography>
          </Stack>
        }
        sx={{
          '& .MuiSnackbarContent-root': {
            background: tokens.color.textPrimary,
            borderRadius: `${tokens.radius.sm}px`,
          },
        }}
      />
    </Box>
  )
}
