import { useState } from 'react'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { PollOption } from '../api/pollApi'
import { CandidateCard } from './CandidateCard'
import { PageStatus } from './PageStatus'
import { tokens } from '../theme'

/** "참여 멤버" section: sort control plus the candidate card grid. Owns the sort order. */
export function CandidateSection({ pollOptions, rankOf, showRanks, myOptionId, disabled, onVote }: {
  pollOptions: PollOption[]
  rankOf: (optionId: number) => number
  showRanks: boolean
  myOptionId: number | undefined
  disabled: boolean
  onVote: (optionId: number) => void
}) {
  const [sortOrder, setSortOrder] = useState<'rank' | 'name'>('rank')

  const options = [...pollOptions].sort((a, b) =>
    sortOrder === 'name'
      ? a.name.localeCompare(b.name, 'ko')
      : rankOf(a.optionId) - rankOf(b.optionId),
  )

  return (
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
              rank={showRanks ? rankOf(option.optionId) : undefined}
              selected={myOptionId === option.optionId}
              disabled={disabled}
              onVote={() => onVote(option.optionId)}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
