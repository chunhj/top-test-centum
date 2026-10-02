import { lazy, Suspense } from 'react'
import { Link as RouterLink, Route, Routes } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'
import { Logo } from './components/Logo'
import { PollListPage } from './pages/PollListPage'
import { PollDetailPage } from './pages/PollDetailPage'
import { AdminAuthProvider, useAdminAuth } from './lib/adminAuth'
import { tokens } from './theme'

// Admin screens (and the date-picker stack they pull in) are split out of the voter bundle.
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const AdminEditPollPage = lazy(() => import('./pages/AdminEditPollPage').then((module) => ({ default: module.AdminEditPollPage })))

function App() {
  return (
    <AdminAuthProvider>
      <AppShell />
    </AdminAuthProvider>
  )
}

function AppShell() {
  const { credentials, logout } = useAdminAuth()
  const navigate = useNavigate()

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        sx={{
          background: tokens.color.surface,
          boxShadow: 'none',
          borderBottom: `1px solid ${tokens.color.border}`,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            maxWidth: 1240,
            width: '100%',
            margin: '0 auto',
            padding: '0 22px',
            minHeight: 68,
            gap: '24px',
          }}
        >
          <Box
            component={RouterLink}
            to="/"
            sx={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0, color: 'inherit', textDecoration: 'none' }}
          >
            <Logo />
            <Typography
              component="span"
              sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', color: tokens.color.textMuted, whiteSpace: 'nowrap' }}
            >
              Today's Opinion &amp; Poll
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              component={RouterLink}
              to="/"
              variant="text"
              sx={{ color: tokens.color.textSecondary, padding: '8px 12px' }}
            >
              진행 중 투표
            </Button>
            {credentials ? (
              <Button
                type="button"
                onClick={() => { logout(); navigate('/') }}
                sx={{
                  background: tokens.color.urgentBg,
                  color: tokens.color.urgentText,
                  padding: '11px 20px',
                  fontSize: 14,
                  '&:hover': { background: tokens.color.urgentBg, opacity: 0.85 },
                }}
              >
                로그아웃
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to="/admin"
                sx={{
                  background: tokens.color.textPrimary,
                  color: '#FFFFFF',
                  padding: '11px 20px',
                  fontSize: 14,
                  '&:hover': { background: '#000000' },
                }}
              >
                관리자 페이지
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/polls/:pollId" element={<PollDetailPage />} />
        <Route path="/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
        <Route path="/admin/polls/:pollId/edit" element={<Suspense fallback={null}><AdminEditPollPage /></Suspense>} />
      </Routes>
    </>
  )
}

export default App
