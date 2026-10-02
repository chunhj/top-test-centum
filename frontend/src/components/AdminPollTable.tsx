import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { PollStatus } from '../api/pollApi'
import type { AdminPoll, AdminPollAction } from '../api/adminApi'
import type { DeleteTarget } from './DeletePollDialog'
import { statusLabel, statusTone, formatDateTime } from '../lib/format'
import { tokens } from '../theme'

const actionFor = (status: PollStatus) => (status === 'SCHEDULED' ? 'start' : undefined)
const actionLabel = { start: '개시' } as const

/** Admin poll list table with per-row edit / start / close / delete actions. */
export function AdminPollTable({ polls, transitionPending, onEdit, onTransition, onDelete }: {
  polls: AdminPoll[]
  transitionPending: boolean
  onEdit: (pollId: number) => void
  onTransition: (pollId: number, action: AdminPollAction) => void
  onDelete: (target: DeleteTarget) => void
}) {
  return (
    <TableContainer sx={{ marginBottom: '8px' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>투표명</TableCell>
            <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>상태</TableCell>
            <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>참여</TableCell>
            <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>마감</TableCell>
            <TableCell sx={{ fontWeight: 700, color: tokens.color.textMuted }}>운영</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {polls.map((poll) => {
            const action = actionFor(poll.status)
            const tone = statusTone[poll.status]
            return (
              <TableRow key={poll.pollId}>
                <TableCell><Typography sx={{ fontWeight: 700, color: tokens.color.textPrimary }}>{poll.title}</Typography></TableCell>
                <TableCell>
                  <Chip label={statusLabel[poll.status]} size="small" sx={{ background: tone.background, color: tone.color, fontSize: 11.5 }} />
                </TableCell>
                <TableCell>{poll.participantCount.toLocaleString()}</TableCell>
                <TableCell>{formatDateTime(poll.endsAt)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      onClick={() => onEdit(poll.pollId)}
                      sx={{ background: tokens.color.surfaceMuted, color: tokens.color.textPrimary, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.border } }}
                    >
                      수정
                    </Button>
                    {action && (
                      <Button
                        size="small"
                        onClick={() => onTransition(poll.pollId, action)}
                        disabled={transitionPending}
                        sx={{ background: tokens.color.surfaceMuted, color: tokens.color.textPrimary, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.border } }}
                      >
                        {actionLabel[action]}
                      </Button>
                    )}
                    {poll.status !== 'CLOSED' && (
                      <Button
                        size="small"
                        onClick={() => onTransition(poll.pollId, 'close')}
                        disabled={transitionPending}
                        sx={{ background: tokens.color.urgentBg, color: tokens.color.urgentText, fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.urgentBg, opacity: 0.85 } }}
                      >
                        마감
                      </Button>
                    )}
                    <Button
                      size="small"
                      onClick={() => onDelete({ pollId: poll.pollId, title: poll.title })}
                      sx={{ background: tokens.color.dangerBg, color: '#FFFFFF', fontSize: 12, padding: '6px 12px', '&:hover': { background: tokens.color.dangerBgHover } }}
                    >
                      삭제
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
