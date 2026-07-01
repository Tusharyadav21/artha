import {
  MessageSquareIcon,
  BarChart3Icon,
  LandmarkIcon,
  FileTextIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export type WorkflowSection = "workspace" | "tools" | "settings"

export interface WorkflowDef {
  id: string
  label: string
  icon: LucideIcon
  href: string
  section: WorkflowSection
  description: string
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquareIcon,
    href: "/chat",
    section: "workspace",
    description: "Ask questions about your documents",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3Icon,
    href: "/analytics",
    section: "workspace",
    description: "Usage metrics and system health",
  },
  {
    id: "financial",
    label: "Financial",
    icon: LandmarkIcon,
    href: "/financial",
    section: "tools",
    description: "Parse bank statements",
  },
  {
    id: "extract",
    label: "Extract",
    icon: FileTextIcon,
    href: "/extract",
    section: "tools",
    description: "Extract text from images and PDFs",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    href: "/settings",
    section: "settings",
    description: "Profile, appearance, and defaults",
  },
]

export const WORKFLOW_BY_ID = Object.fromEntries(
  WORKFLOWS.map((w) => [w.id, w])
)

export const WORKFLOWS_BY_SECTION = WORKFLOWS.reduce(
  (acc, w) => {
    ; (acc[w.section] ??= []).push(w)
    return acc
  },
  {} as Record<WorkflowSection, WorkflowDef[]>
)
