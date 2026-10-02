import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AdminCredentials } from '../api/adminApi'

const STORAGE_KEY = 'admin-credentials'

/**
 * sessionStorage (not localStorage) is deliberate: it survives a refresh but is
 * cleared when the tab/browser closes, so closing the browser logs the admin out.
 */
function readStoredCredentials(): AdminCredentials | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminCredentials) : undefined
  } catch {
    return undefined
  }
}

interface AdminAuthContextValue {
  credentials: AdminCredentials | undefined
  login: (credentials: AdminCredentials) => void
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<AdminCredentials | undefined>(readStoredCredentials)

  const login = useCallback((next: AdminCredentials) => {
    setCredentials(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures (private browsing, quota, etc.) — login still works for this tab
    }
  }, [])

  const logout = useCallback(() => {
    setCredentials(undefined)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  // Stable value: consumers only re-render when credentials change, and effects that list
  // logout as a dependency don't re-run on every provider render.
  const value = useMemo(() => ({ credentials, login, logout }), [credentials, login, logout])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return context
}
