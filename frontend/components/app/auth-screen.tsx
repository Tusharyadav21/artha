"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { ACTIVE_PROJECT_KEY, TOKEN_KEY } from "@/lib/app-storage"
import { apiFetch, type TokenResponse } from "@/lib/api"

export function AuthScreen() {
  const router = useRouter()
  const [email, setEmail] = React.useState("demo@example.com")
  const [password, setPassword] = React.useState("local-first-rag")
  const [isRegistering, setIsRegistering] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const path = isRegistering ? "/api/auth/register" : "/api/auth/login"
      const response = await apiFetch<TokenResponse>(path, null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      window.localStorage.setItem(TOKEN_KEY, response.access_token)
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
      toast.success(
        isRegistering
          ? "Account created successfully"
          : "Signed in successfully"
      )
      router.replace(`/${response.user.default_home_tab}`)
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Authentication failed"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-primary)/18,transparent_28rem)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col gap-6 lg:flex">
          <div className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Local-first workspace
          </div>
          <div className="max-w-xl space-y-4">
            <h1 className="font-heading text-5xl font-semibold tracking-tight">
              Build, search, and chat with your knowledge base in one place.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Agentic RAG now opens into a route-based workspace with project
              navigation, a focused chat surface, and persistent personal
              settings.
            </p>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Agentic RAG</CardTitle>
            <CardDescription>
              Sign in to manage projects, upload documents, and start a new
              retrieval-backed chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleAuth}>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
              />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
              />
              <Button disabled={isLoading} type="submit">
                {isLoading
                  ? "Please wait..."
                  : isRegistering
                    ? "Create account"
                    : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRegistering((current) => !current)}
              >
                {isRegistering
                  ? "Use existing account"
                  : "Create a new account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
