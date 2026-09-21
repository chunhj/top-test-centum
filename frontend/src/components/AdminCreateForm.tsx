import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs, { type Dayjs } from 'dayjs'
import { tokens } from '../theme'
import type { AdminPollInput } from '../pollApi'

export function AdminCreateForm({ pending, onSubmit }: { pending: boolean; onSubmit: (input: AdminPollInput) => void }) {
  const [title, setTitle] = useState('')
  const [candidates, setCandidates] = useState('')
  const [startsAt, setStartsAt] = useState<Dayjs | null>(() => dayjs().add(1, 'minute'))
  const [endsAt, setEndsAt] = useState<Dayjs | null>(() => dayjs().add(1, 'day'))

  const rangeInvalid = Boolean(startsAt && endsAt && !endsAt.isAfter(startsAt))

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!startsAt || !endsAt || rangeInvalid) return
        const options = candidates
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [name, team, imageUrl] = line.split('|').map((value) => value.trim())
            return { name, team, imageUrl }
          })
        onSubmit({
          title,
          description: '',
          pollType: 'SINGLE',
          maxSelections: 1,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          options,
        })
      }}
      sx={{
        background: tokens.color.surface,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: `${tokens.radius.md}px`,
        padding: '24px 26px',
      }}
    >
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary, marginBottom: '18px' }}>
        새 투표 만들기
      </Typography>
      <Stack spacing={2.5}>
        <TextField
          required
          label="투표 제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
        />
        <Stack direction="row" flexWrap="wrap" spacing={2}>
          <DateTimePicker
            label="시작 일시"
            value={startsAt}
            onChange={(value) => setStartsAt(value)}
            ampm={false}
            format="YYYY-MM-DD HH:mm"
            sx={{ flex: '1 1 220px', minWidth: 0 }}
          />
          <DateTimePicker
            label="종료 일시"
            value={endsAt}
            onChange={(value) => setEndsAt(value)}
            ampm={false}
            format="YYYY-MM-DD HH:mm"
            minDateTime={startsAt ?? undefined}
            sx={{ flex: '1 1 220px', minWidth: 0 }}
            slotProps={{
              textField: {
                error: rangeInvalid,
                helperText: rangeInvalid ? '종료 일시는 시작 일시보다 뒤여야 합니다.' : undefined,
              },
            }}
          />
        </Stack>
        <TextField
          required
          label="후보 목록"
          placeholder="이름 | 팀 · 포지션 | 이미지 URL"
          value={candidates}
          onChange={(event) => setCandidates(event.target.value)}
          multiline
          minRows={4}
          fullWidth
          helperText="한 줄에 후보 한 명씩, '이름 | 팀 · 포지션 | 이미지 URL' 형식으로 입력하세요."
        />
        <Button
          type="submit"
          disabled={pending || rangeInvalid || !startsAt || !endsAt}
          sx={{
            alignSelf: 'flex-start',
            background: tokens.color.textPrimary,
            color: '#FFFFFF',
            padding: '11px 22px',
            '&:hover': { background: '#000000' },
          }}
        >
          {pending ? '저장 중' : '예약 투표 저장'}
        </Button>
      </Stack>
    </Box>
  )
}
