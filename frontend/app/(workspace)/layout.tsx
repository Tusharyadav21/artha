import { WorkspaceShell } from "@/components/app/workspace-shell"

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
