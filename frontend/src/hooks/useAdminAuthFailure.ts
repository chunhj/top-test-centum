import { useEffect, useEffectEvent } from 'react'
import { isAuthError } from '../api/adminApi'
import { useAdminAuth } from '../lib/adminAuth'

/**
 * Drops the stored admin credentials when the server rejects them (401/403), so the header and
 * the admin pages fall back to the logged-out state.
 *
 * - `queryError`: the page's main query error; an auth failure there is handled once when it appears.
 * - Returns `handleAuthError(error)` for mutation `onError`; it returns true when it was an auth failure.
 * - `onAuthFailure` receives the server message (e.g. to keep showing it on the login form).
 */
export function useAdminAuthFailure(queryError: unknown, onAuthFailure?: (message: string) => void) {
  const { logout } = useAdminAuth()

  const handleAuthError = (error: unknown): boolean => {
    if (!isAuthError(error)) return false
    onAuthFailure?.(error.message)
    logout()
    return true
  }

  const onQueryAuthError = useEffectEvent(handleAuthError)
  const queryAuthError = isAuthError(queryError) ? queryError : null
  useEffect(() => {
    if (queryAuthError) onQueryAuthError(queryAuthError)
  }, [queryAuthError])

  return handleAuthError
}
