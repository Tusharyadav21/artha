"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { ACTIVE_PROJECT_KEY, TOKEN_KEY } from "@/lib/app-storage"
import { apiFetch, type TokenResponse } from "@/lib/api"
import { setCookie } from "@/lib/cookies"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: "login" | "register"
}

// fallow-ignore-next-line complexity
export function AuthDialog({ open, onOpenChange, initialMode = "login" }: AuthDialogProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState("tusharydv2910@gmail.com")
  const [displayName, setDisplayName] = React.useState("Tushar Yadav")
  const [password, setPassword] = React.useState("Fino@2026")
  const [isRegistering, setIsRegistering] = React.useState(initialMode === "register")
  const [isForgotPassword, setIsForgotPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    setIsRegistering(initialMode === "register")
  }, [initialMode])

  // fallow-ignore-next-line complexity
  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const path = isRegistering ? "/api/auth/register" : "/api/auth/login"
      const body = isRegistering
        ? { email, password, display_name: displayName }
        : { email, password }

      const response = await apiFetch<TokenResponse>(path, null, {
        method: "POST",
        body: JSON.stringify(body),
      })

      window.localStorage.setItem(TOKEN_KEY, response.access_token)
      setCookie(TOKEN_KEY, response.access_token)
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY)

      toast.success(isRegistering ? "Account created successfully" : "Signed in successfully")

      onOpenChange(false)
      router.replace(`/${response.user.default_home_tab}`)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      await apiFetch("/api/auth/forgot-password", null, {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      toast.success("Reset link sent! Check your email.")
      setIsForgotPassword(false)
      setEmail("")
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Failed to send reset link")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isForgotPassword ? "Reset Password" : "Artha"}
          </DialogTitle>
          <DialogDescription>
            {isForgotPassword
              ? "Enter your email to receive a password reset link."
              : isRegistering
                ? "Create an account to get started"
                : "Sign in to your workspace"}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={isForgotPassword ? handleForgotPassword : handleAuth}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
              disabled={isLoading}
            />
          </div>

          {!isForgotPassword && isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {!isForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {!isForgotPassword && !isRegistering && (
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-primary hover:underline disabled:opacity-50"
                onClick={() => setIsForgotPassword(true)}
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button disabled={isLoading} type="submit" className="mt-2">
            {isLoading
              ? "Please wait..."
              : isForgotPassword
                ? "Send reset link"
                : isRegistering
                  ? "Create account"
                  : "Sign in"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false)
              } else {
                setIsRegistering((current) => !current)
              }
            }}
            disabled={isLoading}
          >
            {isForgotPassword
              ? "Back to sign in"
              : isRegistering
                ? "Use existing account"
                : "Create a new account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
