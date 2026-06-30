import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { WorkspaceShell } from "@/components/app/workspace-shell"
import { TOKEN_KEY } from "@/lib/app-storage"

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_KEY)

  if (!token) {
    redirect("/")
  }

  return <WorkspaceShell>{children}</WorkspaceShell>
}
