import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TOKEN_KEY } from "@/lib/app-storage"

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_KEY)

  if (token) {
    // If the user is authenticated, send them to the chat workspace
    redirect("/chat")
  } else {
    // Otherwise, send them to the authentication screen
    redirect("/auth")
  }
}
