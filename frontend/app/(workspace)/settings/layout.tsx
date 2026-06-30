import { ReactNode } from "react"
import Link from "next/link"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-background">
      <aside className="w-full md:w-64 border-r border-border/50 bg-muted/10 shrink-0">
        <nav className="flex flex-col gap-1 p-4 sticky top-0">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">General</h3>
          <Link href="/settings" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
            Workspace Settings
          </Link>

          <h3 className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Config</h3>
          <Link href="/settings/agents" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
            Agents
          </Link>
          <Link href="/settings/tools" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
            Tools
          </Link>
          <Link href="/settings/prompts" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
            Prompts
          </Link>
          <Link href="/settings/models" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
            Models
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
