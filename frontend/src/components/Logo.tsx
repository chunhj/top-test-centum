import Box from '@mui/material/Box'
import { tokens } from '../theme'

export function Logo() {
  return (
    <Box
      component="span"
      aria-label="TOP"
      sx={{
        fontFamily: tokens.fontFamily.display,
        fontSize: 25,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: tokens.color.textPrimary,
        lineHeight: 1,
      }}
    >
      TOP
    </Box>
  )
}
