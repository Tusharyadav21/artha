import { AuthProvider, ProjectsProvider, DocumentsProvider, ChatProvider } from "@/hooks"

export function WorkspaceProviders({ children }: React.PropsWithChildren) {
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
