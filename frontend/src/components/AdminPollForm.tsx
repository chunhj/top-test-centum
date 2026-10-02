import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/ko'
import dayjs, { type Dayjs } from 'dayjs'
import { tokens } from '../theme'
import type { AdminPollFormValues, AdminPollOptionInput } from '../lib/adminPollInput'
import { DEFAULT_CANDIDATE_TEMPLATE } from '../lib/candidateTemplate'

let rowKeySeq = 0
function nextRowKey() {
  rowKeySeq += 1
  return `new-${rowKeySeq}`
}

interface CandidateRow extends AdminPollOptionInput {
  rowKey: string
}

function toRows(options: AdminPollOptionInput[] | undefined, fallback: AdminPollOptionInput[]): CandidateRow[] {
  const source = options && options.length > 0 ? options : fallback
  return source.map((option) => ({
    rowKey: option.optionId ? `option-${option.optionId}` : nextRowKey(),
    ...option,
  }))
}

export function AdminPollForm({
  mode,
  pending,
  error,
  initial,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  pending: boolean
  error?: string
  initial?: AdminPollFormValues
  onSubmit: (values: AdminPollFormValues) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startsAt, setStartsAt] = useState<Dayjs | null>(() => (initial ? dayjs(initial.startsAt) : dayjs().add(10, 'minute')))
  const [endsAt, setEndsAt] = useState<Dayjs | null>(() => (initial ? dayjs(initial.endsAt) : dayjs().add(1, 'day')))
  // 시작 일시는 지금부터 최소 10분 뒤부터만 고를 수 있게 한다 (신규 생성 기준).
  const minStartsAt = useMemo(() => dayjs().add(10, 'minute'), [])
  const [rows, setRows] = useState<CandidateRow[]>(() =>
    toRows(initial?.options, mode === 'create' ? DEFAULT_CANDIDATE_TEMPLATE : [{ name: '', team: '', imageUrl: '' }]),
  )

  const rangeInvalid = Boolean(startsAt && endsAt && !endsAt.isAfter(startsAt))
  const validRows = rows.filter((row) => row.name.trim())
  const candidatesInvalid = validRows.length === 0

  const updateRow = (rowKey: string, patch: Partial<CandidateRow>) => {
    setRows((current) => current.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)))
  }
  const removeRow = (rowKey: string) => {
    setRows((current) => current.filter((row) => row.rowKey !== rowKey))
  }
  const addRow = () => {
    setRows((current) => [...current, { rowKey: nextRowKey(), name: '', team: '', imageUrl: '' }])
  }

  // Provided here (not in main.tsx) so the date-picker stack only loads with the admin screens.
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!startsAt || !endsAt || rangeInvalid || candidatesInvalid) return
          onSubmit({
            title,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            options: validRows.map(({ rowKey: _rowKey, ...option }) => option),
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
          {mode === 'create' ? '새 투표 만들기' : '투표 수정'}
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
              minDateTime={mode === 'create' ? minStartsAt : undefined}
              sx={{ flex: '1 1 220px', minWidth: 0 }}
              slotProps={
                mode === 'create'
                  ? { textField: { helperText: '지금으로부터 최소 10분 뒤부터 선택할 수 있습니다.' } }
                  : undefined
              }
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

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.color.textSecondary, marginBottom: '10px' }}>
              후보 목록{mode === 'edit' ? ` · 총 ${rows.length}명` : ''}
            </Typography>
            {mode === 'edit' && (
              <Typography sx={{ fontSize: 11.5, color: tokens.color.textFaint, marginBottom: '10px' }}>
                이 화면에서는 후보 정보 수정·추가는 지원하지 않습니다. X를 누르면 해당 후보만 제거됩니다.
              </Typography>
            )}
            <Stack spacing={1.5}>
              {rows.map((row, index) => (
                <Stack key={row.rowKey} direction="row" alignItems="flex-start" spacing={1.5}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.color.textFaint, paddingTop: '14px', minWidth: 16 }}>
                    {index + 1}
                  </Typography>
                  <TextField
                    required
                    label="이름"
                    value={row.name}
                    onChange={(event) => updateRow(row.rowKey, { name: event.target.value })}
                    slotProps={{ input: { readOnly: mode === 'edit' } }}
                    sx={{ flex: '1 1 160px', minWidth: 0 }}
                  />
                  <TextField
                    label="팀 · 포지션"
                    value={row.team}
                    onChange={(event) => updateRow(row.rowKey, { team: event.target.value })}
                    slotProps={{ input: { readOnly: mode === 'edit' } }}
                    sx={{ flex: '1 1 160px', minWidth: 0 }}
                  />
                  <TextField
                    label="이미지 URL"
                    value={row.imageUrl}
                    onChange={(event) => updateRow(row.rowKey, { imageUrl: event.target.value })}
                    slotProps={{ input: { readOnly: mode === 'edit' } }}
                    sx={{ flex: '2 1 220px', minWidth: 0 }}
                  />
                  <IconButton
                    type="button"
                    aria-label="후보 삭제"
                    onClick={() => removeRow(row.rowKey)}
                    disabled={rows.length <= 1}
                    sx={{ marginTop: '4px' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            {mode === 'create' && (
              <Button
                type="button"
                onClick={addRow}
                sx={{ marginTop: '12px', color: tokens.color.accent, '&:hover': { background: tokens.color.accentSoftBg } }}
              >
                + 후보 추가
              </Button>
            )}
          </Box>

          {error && (
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText }}>{error}</Typography>
          )}

          <Button
            type="submit"
            disabled={pending || rangeInvalid || !startsAt || !endsAt || candidatesInvalid}
            sx={{
              alignSelf: 'flex-end',
              background: tokens.color.textPrimary,
              color: '#FFFFFF',
              padding: '11px 22px',
              '&:hover': { background: '#000000' },
            }}
          >
            {pending ? '저장 중' : mode === 'create' ? '예약 투표 저장' : '수정 사항 저장'}
          </Button>
        </Stack>
      </Box>
    </LocalizationProvider>
  )
}
