"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { apiFetch, type User, type UserSettingsUpdate } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"
import { getCookie, removeCookie, setCookie } from "@/lib/cookies"
import { toast } from "@/components/ui/toast"

interface AuthContextValue {
  token: string | null
  user: User | null
  isLoadingSession: boolean
  signOut: () => void
  refreshSession: () => Promise<void>
  updateUserSettings: (updates: UserSettingsUpdate) => Promise<User | null>
  authedFetch: <T>(path: string, init?: RequestInit) => Promise<T>
  isSavingSettings: boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function readStoredToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const { setTheme } = useTheme()
  const [token, setToken] = React.useState<string | null>(readStoredToken)
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoadingSession, setIsLoadingSession] = React.useState(Boolean(token))
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)

  const authedFetch = React.useCallback(
    <T,>(path: string, init?: RequestInit) =>
      apiFetch<T>(path, token, init),
    [token]
  )

  const clearSession = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY)
      removeCookie(TOKEN_KEY)
    }
    setToken(null)
    setUser(null)
  }, [])

  const signOut = React.useCallback(() => {
    clearSession()
  }, [clearSession])

  const refreshSession = React.useCallback(async () => {
    const storedToken = readStoredToken()
    if (!storedToken) {
      setToken(null)
      setIsLoadingSession(false)
      return
    }

    setToken(storedToken)
    setIsLoadingSession(true)

    try {
      const nextUser = await apiFetch<User>("/api/auth/me", storedToken)
      setUser(nextUser)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not load account")
      clearSession()
    } finally {
      setIsLoadingSession(false)
    }
  }, [clearSession])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSession()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshSession])

  React.useEffect(() => {
    if (token && !getCookie(TOKEN_KEY)) {
      setCookie(TOKEN_KEY, token)
    }
  }, [token])

  React.useEffect(() => {
    if (!user?.theme_preference) return
    setTheme(user.theme_preference)
  }, [setTheme, user?.theme_preference])

  const updateUserSettings = React.useCallback(
    async (updates: UserSettingsUpdate) => {
      if (!token) return null

      setIsSavingSettings(true)
      try {
        if (updates.theme_preference) {
          setTheme(updates.theme_preference)
        }

        const nextUser = await authedFetch<User>("/api/auth/me", {
          method: "PATCH",
          body: JSON.stringify(updates),
        })
        setUser(nextUser)
        toast.success("Settings saved")
        return nextUser
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not save settings")
        return null
      } finally {
        setIsSavingSettings(false)
      }
    },
    [authedFetch, setTheme, token]
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isLoadingSession,
      signOut,
      refreshSession,
      updateUserSettings,
      authedFetch,
      isSavingSettings,
    }),
    [token, user, isLoadingSession, signOut, refreshSession, updateUserSettings, authedFetch, isSavingSettings]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = React.useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
