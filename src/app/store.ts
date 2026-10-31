import { useSyncExternalStore } from "react"
import { getSession } from "./api"
import { projects as initialProjects, tasks as initialTasks } from "./data"
import type { Project, Task, TaskStatus } from "./data"

export type WorkspaceData = {
  tasks: Task[]
  projects: Project[]
}

const storageKey = "workspace-pm-ui-data"
const listeners = new Set<() => void>()
let snapshot: WorkspaceData | undefined

function getSnapshot(): WorkspaceData {
  if (snapshot) return snapshot

  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved)
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as WorkspaceData).tasks) &&
        Array.isArray((parsed as WorkspaceData).projects)
      ) {
        snapshot = parsed as WorkspaceData
        return snapshot
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }

  snapshot = {
    tasks: initialTasks.map((task) => ({ ...task, owner: { ...task.owner } })),
    projects: initialProjects.map((project) => ({ ...project })),
  }
  return snapshot
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function updateData(update: (current: WorkspaceData) => WorkspaceData) {
  snapshot = update(getSnapshot())
  localStorage.setItem(storageKey, JSON.stringify(snapshot))
  listeners.forEach((listener) => listener())
}

export function useWorkspaceData() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function createTask(input: {
  title: string
  project: string
  priority: Task["priority"]
  due: string
  status?: TaskStatus
}) {
  const userName = getSession()?.user.name ?? "You"
  const initials = userName
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()

  updateData((current) => {
    const project = current.projects.find((item) => item.name === input.project)
    const prefix = project?.key ?? "TASK"
    const nextNumber =
      current.tasks.reduce((highest, task) => {
        const number = task.key.startsWith(`${prefix}-`)
          ? Number(task.key.slice(prefix.length + 1))
          : 0
        return Number.isFinite(number) ? Math.max(highest, number) : highest
      }, 0) + 1

    return {
      ...current,
      tasks: [
        {
          id: crypto.randomUUID(),
          key: `${prefix}-${nextNumber}`,
          title: input.title.trim(),
          project: input.project,
          status: input.status ?? "To do",
          priority: input.priority,
          due: input.due,
          dueLabel: input.due
            ? new Date(`${input.due}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "No due date",
          owner: {
            name: userName,
            initials,
            color: "bg-violet-100 text-violet-700",
          },
          progress: 0,
        },
        ...current.tasks,
      ],
    }
  })
}

export function setTaskStatus(id: string, status: TaskStatus) {
  updateData((current) => ({
    ...current,
    tasks: current.tasks.map((task) =>
      task.id === id
        ? { ...task, status, progress: status === "Done" ? 100 : task.progress }
        : task,
    ),
  }))
}

export function createProject(input: {
  name: string
  space: string
  due: string
}) {
  updateData((current) => {
    const prefix =
      input.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3) || "NEW"
    const key = current.projects.some((project) => project.key === prefix)
      ? `${prefix}${current.projects.length + 1}`
      : prefix

    return {
      ...current,
      projects: [
        {
          key,
          name: input.name.trim(),
          space: input.space.trim() || "General",
          status: "Active",
          progress: 0,
          tasks: 0,
          due: input.due
            ? new Date(`${input.due}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "No due date",
          color: "bg-indigo-500",
        },
        ...current.projects,
      ],
    }
  })
}

export function setProjectStatus(key: string, status: Project["status"]) {
  updateData((current) => ({
    ...current,
    projects: current.projects.map((project) =>
      project.key === key ? { ...project, status } : project,
    ),
  }))
}
