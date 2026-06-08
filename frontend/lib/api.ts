const DEFAULT_API_URL = "http://localhost:8000"

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/+$/, "")

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export interface User {
  id: string
  email: string
  display_name: string | null
  theme_preference: "system" | "light" | "dark"
  default_home_tab: "chat" | "library" | "settings"
  sidebar_collapsed: boolean
  new_chat_scope_mode: "clear" | "remember" | "all-completed"
  created_at: string
}

export interface UserSettingsUpdate {
  display_name?: string | null
  theme_preference?: User["theme_preference"]
  default_home_tab?: User["default_home_tab"]
  sidebar_collapsed?: boolean
  new_chat_scope_mode?: User["new_chat_scope_mode"]
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Project {
  id: string
  name: string
  system_prompt: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

export interface DocumentItem {
  id: string
  filename: string
  mime_type: string | null
  file_size: number
  content_sha256: string
  status: "pending" | "processing" | "completed" | "failed"
  error_message: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
}

export interface Conversation {
  id: string
  project_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id?: string
  conversation_id?: string
  role: "user" | "assistant" | "system"
  content: string
  metadata_?: Record<string, unknown>
  created_at?: string
}

export interface Source {
  document_id: string
  filename: string
  content: string
  score: number
}

export interface ChatRequest {
  conversation_id?: string | null
  message: string
  document_ids?: string[] | null
  model?: string | null
  num_ctx?: number | null
  num_predict?: number | null
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface FeedbackRequest {
  rating: "up" | "down"
  comment?: string | null
}

function getNetworkErrorMessage(): string {
  const origin =
    typeof window === "undefined" ? "" : ` from ${window.location.origin}`
  return `Could not reach API at ${API_URL}${origin}. Make sure the backend is running and that CORS allows this frontend origin.`
}

// fallow-ignore-next-line complexity
async function readErrorDetail(response: Response): Promise<string> {
  const body = await response.text()
  if (!body) {
    return `Request failed with ${response.status}`
  }

  try {
    const parsed = JSON.parse(body) as { detail?: unknown }
    if (typeof parsed.detail === "string") {
      return parsed.detail
    }
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) => {
          if (typeof item === "object" && item && "msg" in item) {
            return String(item.msg)
          }
          return String(item)
        })
        .join("; ")
    }
  } catch {
    return body
  }

  return body
}

// fallow-ignore-next-line complexity
export async function apiFetch<T>(
  path: string,
  token: string | null,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let response: Response
  try {
    response = await fetch(apiUrl(path), { ...init, headers })
  } catch (caught) {
    if (caught instanceof TypeError) {
      throw new Error(getNetworkErrorMessage())
    }
    throw caught
  }

  if (!response.ok) {
    throw new Error(await readErrorDetail(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface OllamaSettings {
  mode: "local" | "cloud"
  localModel: string
  cloudModel: string
  embedModel: string
  numCtx: number
  numPredict: number
}

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  mode: "local",
  localModel: "gemma4:e4b",
  cloudModel: "gemma4:31b-cloud",
  embedModel: "nomic-embed-text",
  numCtx: 4096,
  numPredict: 512,
}

