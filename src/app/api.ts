export type WorkspaceSummary = {
  id: string
  name: string
  slug: string
  description?: string | null
  role: string
  isActive: boolean
}

export type WorkspaceRole = "owner" | "project_manager" | "team_leader" | "member" | "tester"

export type WorkspaceInvitationDetails = {
  email: string
  role: WorkspaceRole
  workspace: { id: string; name: string }
}

export type Session = {
  token: string
  user: { id: string; name: string; email: string }
  workspaces: WorkspaceSummary[]
  activeWorkspace?: WorkspaceSummary
}

export type Developer = {
  id: string
  name: string
  email: string
}

export type WorkspaceMember = Developer & {
  role: WorkspaceRole
}

export type WorkspaceTask = {
  id: string
  number: string
  title: string
  description: string | null
  status:
    | "backlog"
    | "todo"
    | "in_progress"
    | "in_review"
    | "done"
    | "blocked"
    | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  startDate: string | null
  dueDate: string | null
  progressPct: number
  project: {
    id: string
    key: string
    title: string
    space?: { id: string; name: string }
  }
  owner: Developer
}

export type WorkspaceProject = {
  id: string
  key: string
  title: string
  description: string | null
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  startDate: string | null
  targetDate: string | null
  space: { id: string; name: string }
}

export type WorkspaceSpace = {
  id: string
  name: string
  description: string | null
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
    session.token !== "demo" &&
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession()

  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      "The API is unavailable. Start the Express server and try again.",
    )
  }

  let body: ApiErrorShape & T | null = null

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

async function listAll<T>(path: string) {
  const data: T[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while (data.length < total) {
    const result = await request<{
      data: T[]
      meta: { total: number }
    }>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&per_page=100`)
    data.push(...result.data)
    total = result.meta.total
    page += 1
  }

  return { data }
}

export const api = {
  login: (input: { email: string; password: string }) =>
    request<{ data: Session }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getInvitation: (token: string) =>
    request<{ data: WorkspaceInvitationDetails }>(
      `/auth/invitations/${encodeURIComponent(token)}`,
    ),

  register: (input: {
    name: string
    email: string
    password: string
    invitationToken: string
  }) =>
    request<{ data: Session }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createWorkspaceInvitation: (
    workspaceId: string,
    input: { email: string; role: WorkspaceRole },
  ) =>
    request<{
      data: {
        id: string
        email: string
        role: WorkspaceRole
        expiresAt: string
        invitationPath: string
      }
    }>(`/workspaces/${encodeURIComponent(workspaceId)}/invitations`, {
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

  listDevelopers: (workspaceId: string) =>
    request<{ data: Developer[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/developers`,
    ),

  listWorkspaceMembers: (workspaceId: string) =>
    request<{ data: WorkspaceMember[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members`,
    ),

  createDeveloper: (
    workspaceId: string,
    input: { name: string; email: string },
  ) =>
    request<{
      data: {
        developer: Developer
        generatedPassword: string
        loginPath: string
      }
    }>(`/workspaces/${encodeURIComponent(workspaceId)}/developers`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listWorkspaceTasks: (workspaceId: string) =>
    listAll<WorkspaceTask>(
      `/workspaces/${encodeURIComponent(workspaceId)}/tasks`,
    ),

  listWorkspaceProjects: (workspaceId: string) =>
    listAll<WorkspaceProject>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    ),

  listWorkspaceSpaces: (workspaceId: string) =>
    request<{ data: WorkspaceSpace[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/spaces`,
    ),

  createWorkspaceSpace: (
    workspaceId: string,
    input: { name: string; description?: string },
  ) =>
    request<{ data: WorkspaceSpace }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/spaces`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  createWorkspaceProject: (
    workspaceId: string,
    input: {
      name: string
      space: string
      description?: string
      startDate?: string
      targetDate?: string
    },
  ) =>
    request<{ data: WorkspaceProject }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  updateWorkspaceProjectStatus: (
    workspaceId: string,
    projectId: string,
    status: WorkspaceProject["status"],
  ) =>
    request<{ data: WorkspaceProject }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),

  setWorkspaceActive: (workspaceId: string, isActive: boolean) =>
    request<{ data: WorkspaceSummary }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/status`,
      { method: "PATCH", body: JSON.stringify({ isActive }) },
    ),

  deleteWorkspaceProject: (workspaceId: string, projectId: string) =>
    request<{ data: { id: string } }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    ),

  createAssignedTask: (
    workspaceId: string,
    input: {
      title: string
      description: string
      projectId: string
      developerId: string
      priority: WorkspaceTask["priority"]
      status: WorkspaceTask["status"]
      startDate: string
      dueDate: string
    },
  ) =>
    request<{ data: WorkspaceTask }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/tasks`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  updateTaskStatus: (
    workspaceId: string,
    taskId: string,
    status: WorkspaceTask["status"],
  ) =>
    request<{ data: WorkspaceTask }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),

  assignTask: (workspaceId: string, taskId: string, developerId: string) =>
    request<{ data: WorkspaceTask }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/assignee`,
      { method: "PATCH", body: JSON.stringify({ developerId }) },
    ),
}
