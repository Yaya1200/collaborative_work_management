
export type WorkspaceSummary = {
  id: string
  name: string
  slug: string
  description?: string | null
  role: string
}

export type Session = {
  token: string
  user: { id: string; name: string; email: string }
  workspaces: WorkspaceSummary[]
  activeWorkspace?: WorkspaceSummary
  demo?: boolean
}

type ApiErrorShape = {
  error?: {
    message?: string
    fields?: Record<string, string[]>
  }
}

export class ApiError extends Error {
  fields?: Record<string, string[]>

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message)
    this.name = "ApiError"
    this.fields = fields
  }
}

const baseUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"
).replace(/\/+$/, "")

const sessionKey = "workspace-pm-session"

function isValidSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false

  const session = value as Partial<Session>

  return (
    typeof session.token === "string" &&
    !!session.user &&
    typeof session.user.id === "string" &&
    typeof session.user.name === "string" &&
    typeof session.user.email === "string" &&
    Array.isArray(session.workspaces)
  )
}

export function getSession(): Session | null {
  try {
    const value = localStorage.getItem(sessionKey)
    if (!value) return null

    const parsed: unknown = JSON.parse(value)

    if (!isValidSession(parsed)) {
      clearSession()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(sessionKey, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(sessionKey)
}

export function createDemoSession(): Session {
  const workspace: WorkspaceSummary = {
    id: "demo",
    name: "Northstar Labs",
    slug: "northstar-labs",
    role: "owner",
  }

  return {
    token: "demo",
    user: {
      id: "demo-user",
      name: "Alex Morgan",
      email: "alex@northstar.test",
    },
    workspaces: [workspace],
    activeWorkspace: workspace,
    demo: true,
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession()

  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session && !session.demo
          ? { Authorization: `Bearer ${session.token}` }
          : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      "The API is unavailable. Start the Express server and try again.",
    )
  }

  let body: (ApiErrorShape & T) | null = null

  try {
    body = await response.json()
  } catch {
    if (!response.ok) {
      throw new ApiError(
        `The server returned an invalid response (${response.status}).`,
      )
    }

    throw new ApiError("The server returned an invalid response.")
  }

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${response.status}).`,
      body?.error?.fields,
    )
  }

  if (!body) throw new ApiError("The server returned an empty response.")
  return body as T
}

export const api = {
  register: (input: {
    name: string
    email: string
    password: string
  }) =>
    request<{ data: Session }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ data: Session }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createWorkspace: (input: {
    name: string
    slug: string
    description: string
  }) =>
    request<{ data: WorkspaceSummary }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(input),
    }),
}
