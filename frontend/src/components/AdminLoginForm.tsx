import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { AdminCredentials } from '../api/adminApi'
import { tokens } from '../theme'

/** Admin sign-in card. The typed values are owned by the caller so they survive a return to this form. */
export function AdminLoginForm({ login, onLoginChange, loginError, pending, onSubmit }: {
  login: AdminCredentials
  onLoginChange: (next: AdminCredentials) => void
  loginError: string | undefined
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Box
      component="form"
      onSubmit={(event) => { event.preventDefault(); onSubmit() }}
      sx={{
        width: '100%',
        maxWidth: 400,
        marginTop: 'clamp(24px, 6vh, 64px)',
        background: tokens.color.surface,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: `${tokens.radius.md}px`,
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <Chip label="ADMIN" sx={{ alignSelf: 'flex-start', background: tokens.color.textPrimary, color: '#FFFFFF', fontSize: 11 }} />
      <Box>
        <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.color.textPrimary }}>
          관리자 입장
        </Typography>
        <Typography sx={{ fontSize: 13, color: tokens.color.textTertiary, marginTop: '6px' }}>
          투표를 생성하고 운영 상태를 관리합니다.
        </Typography>
      </Box>
      <TextField required autoComplete="username" label="아이디" value={login.username} onChange={(event) => onLoginChange({ ...login, username: event.target.value })} fullWidth />
      <TextField required type="password" autoComplete="current-password" label="비밀번호" value={login.password} onChange={(event) => onLoginChange({ ...login, password: event.target.value })} fullWidth />
      {loginError && (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.color.urgentText }}>{loginError}</Typography>
      )}
      <Button type="submit" disabled={pending} sx={{ background: tokens.color.textPrimary, color: '#FFFFFF', padding: '12px', '&:hover': { background: '#000000' } }}>
        관리자 입장
      </Button>
    </Box>
  )
}
