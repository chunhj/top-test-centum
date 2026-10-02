import { createTheme } from '@mui/material/styles'
import { koKR } from '@mui/material/locale'

// Design tokens extracted from `ui/index.html` and `ui/투표 상세.dc.html`.
// See DESIGN_SYSTEM.md for the coherence rules these values follow.
export const tokens = {
  color: {
    bg: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceMuted: '#F2F3EF',
    border: '#E6E7E3',
    borderStrong: '#DCDDD7',
    textPrimary: '#14171A',
    textSecondary: '#4A5049',
    textTertiary: '#6B7169',
    textMuted: '#8E938C',
    textFaint: '#9AA09A',
    accent: '#1F6E5F',
    accentDark: '#145145',
    accentSoftBg: '#E8F6F1',
    accentSoftText: '#1A5F52',
    ctaBg: '#F8C0D2',
    ctaText: '#55112B',
    ctaTextStrong: '#4B0F25',
    urgentBg: '#FDE7EE',
    urgentText: '#8E1E44',
    endedBg: '#EFF0EC',
    endedText: '#6B7169',
    heroBg: '#111417',
    heroBgDeep: '#0B0D0E',
    countdownDigit: '#A9E2D4',
    // Highlighted card: the viewer's selected candidate and the #1 ranking card.
    highlightBorder: '#C7E0D8',
    highlightBg: '#F3F8F6',
    // Destructive action buttons (poll delete).
    dangerBg: '#C62828',
    dangerBgHover: '#9F1C1C',
    // Diagonal stripes shown behind / instead of candidate images.
    placeholderStripe: '#EFEFEA',
    placeholderStripeAlt: '#F7F7F3',
  },
  radius: { sm: 8, md: 12, pill: 999 },
  fontFamily: {
    base: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
    display: 'Archivo, sans-serif',
  },
}

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      background: { default: tokens.color.bg, paper: tokens.color.surface },
      text: {
        primary: tokens.color.textPrimary,
        secondary: tokens.color.textTertiary,
        disabled: tokens.color.textFaint,
      },
      divider: tokens.color.border,
      primary: {
        main: tokens.color.accent,
        dark: tokens.color.accentDark,
        light: tokens.color.accentSoftBg,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: tokens.color.ctaBg,
        dark: tokens.color.ctaText,
        contrastText: tokens.color.ctaText,
      },
      error: { main: tokens.color.urgentText, light: tokens.color.urgentBg },
      grey: {
        100: tokens.color.surfaceMuted,
        300: tokens.color.border,
        500: tokens.color.textFaint,
        700: tokens.color.textTertiary,
        900: tokens.color.textPrimary,
      },
    },
    shape: { borderRadius: tokens.radius.md },
    typography: {
      fontFamily: tokens.fontFamily.base,
      h1: { fontWeight: 800, letterSpacing: '-0.035em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 800, letterSpacing: '-0.02em' },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: tokens.color.bg, color: tokens.color.textPrimary },
          'a': { color: tokens.color.accent, textDecoration: 'none' },
          'a:hover': { color: tokens.color.accentDark },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: tokens.radius.sm, fontWeight: 700 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.color.border}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.pill, fontWeight: 800 },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.sm },
        },
      },
    },
  },
  koKR,
)
