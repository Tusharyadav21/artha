"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { ACTIVE_PROJECT_KEY, TOKEN_KEY } from "@/lib/app-storage"
import { apiFetch, type User } from "@/lib/api"

export function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!token) {
      router.replace("/auth")
      return
    }

    void apiFetch<User>("/api/auth/me", token)
      .then((user) => {
        router.replace(`/${user.default_home_tab}`)
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY)
        window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
        router.replace("/auth")
      })
  }, [router])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  )
}
