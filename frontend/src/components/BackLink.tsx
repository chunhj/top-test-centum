import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { tokens } from '../theme'

/** "← 목록으로" style link shown at the top of detail/edit pages. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Box
      component={RouterLink}
      to={to}
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
        '&:hover': { background: tokens.color.surfaceMuted, color: tokens.color.textPrimary },
      }}
    >
      <ArrowBackIcon sx={{ fontSize: 15 }} />
      {children}
    </Box>
  )
}
