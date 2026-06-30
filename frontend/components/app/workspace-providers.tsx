import { PropsWithChildren } from "react"
import { AuthProvider, ProjectsProvider, DocumentsProvider, ChatProvider } from "@/hooks"

export function WorkspaceProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <DocumentsProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </DocumentsProvider>
      </ProjectsProvider>
    </AuthProvider>
  )
}
