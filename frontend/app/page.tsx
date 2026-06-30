import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TOKEN_KEY } from "@/lib/app-storage"
import { LandingPage } from "@/components/landing/landing-page"

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_KEY)

  if (token) {
    redirect("/chat")
  }

  return <LandingPage />
}
