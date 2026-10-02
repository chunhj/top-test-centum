import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'

export interface DeleteTarget {
  pollId: number
  title: string
}

/** Confirmation dialog for deleting a poll; closing is blocked while the request is pending. */
export function DeletePollDialog({ deleteTarget, pending, error, onClose, onConfirm }: {
  deleteTarget: DeleteTarget | null
  pending: boolean
  error: string | undefined
  onClose: () => void
  onConfirm: (pollId: number) => void
}) {
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={() => (pending ? undefined : onClose())}>
      <DialogTitle sx={{ fontWeight: 800 }}>투표 삭제</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {deleteTarget ? `'${deleteTarget.title}' 투표를 삭제하시겠습니까?` : '투표를 삭제하시겠습니까?'} 삭제하면 되돌릴 수 없습니다.
        </DialogContentText>
        {error && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText, marginTop: '10px' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ padding: '0 24px 20px' }}>
        <Button type="button" onClick={() => onClose()} disabled={pending} sx={{ color: tokens.color.textSecondary }}>
          취소
        </Button>
        <Button
          type="button"
          onClick={() => deleteTarget && onConfirm(deleteTarget.pollId)}
          disabled={pending}
          sx={{ background: tokens.color.dangerBg, color: '#FFFFFF', padding: '8px 18px', '&:hover': { background: tokens.color.dangerBgHover } }}
        >
          {pending ? '삭제 중' : '확인'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
