"use client"

import * as React from "react"

import { useAuth } from "@/hooks/use-auth"
import { ACTIVE_PROJECT_KEY } from "@/lib/app-storage"
import { type Project } from "@/lib/api"
import { toast } from "@/components/ui/toast"

interface ProjectsContextValue {
  projects: Project[]
  activeProjectId: string | null
  activeProject: Project | undefined
  isCreatingProject: boolean
  isSavingProject: boolean
  createProject: (name: string) => Promise<Project | undefined>
  selectProject: (projectId: string) => Promise<void>
  updateProjectSettings: (systemPrompt: string | null) => Promise<void>
}

const ProjectsContext = React.createContext<ProjectsContextValue | null>(null)

function readStoredProjectId() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY)
}

export function ProjectsProvider({ children }: React.PropsWithChildren) {
  const { token, authedFetch, isLoadingSession, refreshSession } = useAuth()
  const [projects, setProjects] = React.useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null)
  const [isCreatingProject, setIsCreatingProject] = React.useState(false)
  const [isSavingProject, setIsSavingProject] = React.useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  React.useEffect(() => {
    if (!token || isLoadingSession) return
    const storedId = readStoredProjectId()
    authedFetch<Project[]>("/api/projects").then((nextProjects) => {
      setProjects(nextProjects)
      const nextId =
        nextProjects.find((p) => p.id === storedId)?.id ?? nextProjects[0]?.id ?? null
      setActiveProjectId(nextId)
    }).catch(() => {
      void refreshSession()
    })
  }, [token, isLoadingSession, authedFetch, refreshSession])

  const createProject = React.useCallback(
    async (name: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) return

      setIsCreatingProject(true)
      try {
        const project = await authedFetch<Project>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName }),
        })
        setProjects((current) => [project, ...current])
        await selectProject(project.id)
        toast.success("Project created")
        return project
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not create project")
      } finally {
        setIsCreatingProject(false)
      }
    },
    [authedFetch]
  )

  const selectProject = React.useCallback(async (projectId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
    }
    React.startTransition(() => {
      setActiveProjectId(projectId)
    })
  }, [])

  const updateProjectSettings = React.useCallback(
    async (systemPrompt: string | null) => {
      if (!activeProjectId) return

      setIsSavingProject(true)
      try {
        const project = await authedFetch<Project>(`/api/projects/${activeProjectId}`, {
          method: "PATCH",
          body: JSON.stringify({ system_prompt: systemPrompt?.trim() || null }),
        })
        setProjects((current) =>
          current.map((item) => (item.id === project.id ? project : item))
        )
        toast.success("Project prompt saved")
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not save project prompt")
      } finally {
        setIsSavingProject(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const value = React.useMemo<ProjectsContextValue>(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      isCreatingProject,
      isSavingProject,
      createProject,
      selectProject,
      updateProjectSettings,
    }),
    [
      projects,
      activeProjectId,
      activeProject,
      isCreatingProject,
      isSavingProject,
      createProject,
      selectProject,
      updateProjectSettings,
    ]
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const value = React.useContext(ProjectsContext)
  if (!value) throw new Error("useProjects must be used inside ProjectsProvider")
  return value
}
