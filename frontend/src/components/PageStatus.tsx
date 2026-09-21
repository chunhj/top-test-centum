import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { tokens } from '../theme'

export function PageStatus({ children }: { children: ReactNode }) {
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 16px',
        borderRadius: `${tokens.radius.md}px`,
        border: `1px dashed ${tokens.color.borderStrong}`,
        color: tokens.color.textMuted,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {children}
      </Typography>
    </Box>
  )
}
