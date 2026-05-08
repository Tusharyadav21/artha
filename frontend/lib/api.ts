export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export interface User {
  id: string
  email: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Project {
  id: string
  name: string
  created_at: string
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

function getNetworkErrorMessage(): string {
  const origin = typeof window === "undefined" ? "" : ` from ${window.location.origin}`
  return `Could not reach API at ${API_URL}${origin}. Make sure the backend is running and that CORS allows this frontend origin.`
}

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
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch (caught) {
    if (caught instanceof TypeError) {
      throw new Error(getNetworkErrorMessage())
    }
    throw caught
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed with ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}
