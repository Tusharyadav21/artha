"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/api"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link")
      router.replace("/auth")
    }
  }, [token, router])

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await apiFetch("/api/auth/reset-password", null, {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      })
      toast.success("Password reset successfully! Please sign in with your new password.")
      router.replace("/auth")
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) return null

  return (
    <main className="min-h-svh flex items-center justify-center bg-[radial-gradient(circle_at_top_left,var(--color-primary)/18,transparent_28rem)] px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">New Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleReset}>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              type="password"
              required
              minLength={8}
            />
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              type="password"
              required
              minLength={8}
            />
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Resetting..." : "Set new password"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/auth")}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
