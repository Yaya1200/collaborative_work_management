import { useEffect, useMemo, useState } from "react"

import { Link, useParams } from "react-router"

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  Layers3,
  Search,
} from "lucide-react"

import {
  api,
  ApiError,
  getSession,
  type WorkspaceProject,
  type WorkspaceSpace,
  type WorkspaceTask,
} from "./api"

import { SectionCard, StatusPill } from "./components"

export type DeveloperPortalView = "dashboard" | "tasks" | "projects" | "spaces"

const taskStatuses: WorkspaceTask["status"][] = [
  "backlog",

  "todo",

  "in_progress",

  "in_review",

  "blocked",

  "done",
]

function statusLabel(status: WorkspaceTask["status"]) {
  return {
    backlog: "Backlog",

    todo: "To do",

    in_progress: "In progress",

    in_review: "In review",

    blocked: "Blocked",

    done: "Done",

    cancelled: "Cancelled",
  }[status]
}

function formatDate(value: string | null) {
  if (!value) return "No due date"

  const date = new Date(`${value.slice(0, 10)}T00:00:00`)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function formatTaskDateRange(task: WorkspaceTask) {
  if (!task.startDate && !task.dueDate) return "No dates"
  if (!task.startDate) return `Ends ${formatDate(task.dueDate)}`
  if (!task.dueDate) return `Starts ${formatDate(task.startDate)}`
  return `${formatDate(task.startDate)} – ${formatDate(task.dueDate)}`
}

export function DeveloperPortalPage({ view }: { view: DeveloperPortalView }) {
  const { taskId } = useParams()

  const session = getSession()

  const workspaceId = session?.activeWorkspace?.id
  const workspaceActive = session?.activeWorkspace?.isActive !== false

  const [tasks, setTasks] = useState<WorkspaceTask[]>([])

  const [projects, setProjects] = useState<WorkspaceProject[]>([])

  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [query, setQuery] = useState("")

  const [busyTask, setBusyTask] = useState("")

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)

      setError("Choose a workspace to view your assignments.")

      return
    }

    let active = true

    setLoading(true)

    setError("")

    Promise.all([
      api.listWorkspaceTasks(workspaceId),

      api.listWorkspaceProjects(workspaceId),

      api.listWorkspaceSpaces(workspaceId),
    ])

      .then(([taskResult, projectResult, spaceResult]) => {
        if (!active) return

        setTasks(taskResult.data)

        setProjects(projectResult.data)

        setSpaces(spaceResult.data)
      })

      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load your workspace assignments.",
          )
        }
      })

      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [workspaceId])

  const matchingTasks = useMemo(
    () =>
      tasks.filter((task) =>
        `${task.number} ${task.title} ${task.project.title} ${task.project.space?.name ?? ""}`

          .toLowerCase()

          .includes(query.toLowerCase()),
      ),

    [query, tasks],
  )

  async function changeStatus(
    task: WorkspaceTask,
    status: WorkspaceTask["status"],
  ) {
    if (!workspaceId) return

    setBusyTask(task.id)

    setError("")

    try {
      const updated = await api.updateTaskStatus(workspaceId, task.id, status)

      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updated.data : item)),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update this task.",
      )
    } finally {
      setBusyTask("")
    }
  }

  const selectedTask = tasks.find((task) => task.id === taskId)

  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  )

  const overdueTasks = openTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10),
  )

  const pageTitle = {
    dashboard: "My workspace",

    tasks: "My tasks",

    projects: "My projects",

    spaces: "My spaces",
  }[view]

  if (loading) {
    return (
      <div className="page">
        <p className="empty-copy">Loading your assignments…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            {session?.activeWorkspace?.name ?? "Workspace"} <span>›</span>{" "}
            Developer portal
          </p>
          <h1>{taskId ? "Task details" : pageTitle}</h1>
          <p>
            {taskId
              ? "Details and project context for your assigned task."
              : "Only tasks assigned to you and the projects and spaces connected to them."}
          </p>
        </div>
        {!taskId && (
          <Link className="secondary-button" to="/tasks">
            My tasks <ArrowRight size={15} />
          </Link>
        )}
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {taskId ? (
        selectedTask ? (
          <SectionCard className="task-detail-card">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{selectedTask.number}</p>
                <h2>{selectedTask.title}</h2>
                <p>
                  {selectedTask.project.title}
                  {selectedTask.project.space?.name
                    ? ` · ${selectedTask.project.space.name}`
                    : ""}
                </p>
              </div>
              <StatusPill status={statusLabel(selectedTask.status)} />
            </div>
            <p>{selectedTask.description || "No task description provided."}</p>
            <p>
              <strong>Priority:</strong> {selectedTask.priority}
            </p>
            <p>
              <strong>Dates:</strong> {formatTaskDateRange(selectedTask)}
            </p>
            <p>
              <strong>Progress:</strong> {selectedTask.progressPct}%
            </p>
            <label className="form-field">
              <span>Update status</span>
              <div>
                <select
                  disabled={
                    busyTask === selectedTask.id ||
                    !workspaceActive ||
                    selectedTask.status === "cancelled"
                  }
                  onChange={(event) =>
                    void changeStatus(
                      selectedTask,

                      event.target.value as WorkspaceTask["status"],
                    )
                  }
                  value={selectedTask.status}
                >
                  {selectedTask.status === "cancelled" && (
                    <option disabled value="cancelled">
                      Cancelled
                    </option>
                  )}
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </SectionCard>
        ) : (
          <EmptyMessage message="This task is not assigned to your account." />
        )
      ) : view === "dashboard" ? (
        <>
          <div className="stat-grid">
            <PortalStat
              icon={CheckCircle2}
              label="Open tasks"
              value={openTasks.length}
            />
            <PortalStat
              icon={Clock3}
              label="Overdue"
              value={overdueTasks.length}
            />
            <PortalStat
              icon={CircleDot}
              label="In review"
              value={tasks.filter((task) => task.status === "in_review").length}
            />
            <PortalStat
              icon={FolderKanban}
              label="Projects"
              value={projects.length}
            />
          </div>
          <SectionCard
            title="Assigned to me"
            action={
              <Link to="/tasks">
                All tasks <ArrowRight size={14} />
              </Link>
            }
          >
            <TaskRows
              tasks={openTasks.slice(0, 6)}
              onStatusChange={changeStatus}
              busyTask={busyTask}
              workspaceActive={workspaceActive}
            />
          </SectionCard>
          <div className="project-grid">
            {projects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </>
      ) : view === "tasks" ? (
        taskId ? null : (
          <>
            <div className="toolbar">
              <label className="search-field">
                <Search size={17} />
                <input
                  aria-label="Search assigned tasks"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search my assigned tasks"
                  value={query}
                />
              </label>
            </div>
            <SectionCard className="task-table-card">
              <div className="task-table-header">
                <span>Task</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Dates</span>
                <span>Project</span>
                <span />
              </div>
              <TaskRows
                tasks={matchingTasks}
                onStatusChange={changeStatus}
                busyTask={busyTask}
                workspaceActive={workspaceActive}
              />
            </SectionCard>
          </>
        )
      ) : view === "projects" ? (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {!projects.length && (
            <EmptyMessage message="Projects with your assigned tasks will appear here." />
          )}
        </div>
      ) : (
        <div className="project-grid">
          {spaces.map((space) => {
            const relatedProjects = projects.filter(
              (project) => project.space.id === space.id,
            )

            return (
              <SectionCard className="project-card" key={space.id}>
                <div className="project-card-top">
                  <span className="onboarding-icon">
                    <Layers3 size={20} />
                  </span>
                  <span className="project-key">Space</span>
                </div>
                <h2>{space.name}</h2>
                <p>
                  {space.description ||
                    "Space connected to your assigned work."}
                </p>
                <div className="placeholder-content">
                  {relatedProjects.map((project) => (
                    <p className="placeholder-row" key={project.id}>
                      <FolderKanban size={15} />
                      <span>
                        <strong>{project.title}</strong>
                        <small>
                          {project.key} · {project.status}
                        </small>
                      </span>
                    </p>
                  ))}
                </div>
              </SectionCard>
            )
          })}
          {!spaces.length && (
            <EmptyMessage message="Spaces with your assigned tasks will appear here." />
          )}
        </div>
      )}
    </div>
  )
}

function PortalStat({
  icon: Icon,

  label,

  value,
}: {
  icon: typeof CheckCircle2

  label: string

  value: number
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon stat-indigo">
        <Icon size={19} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function TaskRows({
  tasks,

  onStatusChange,

  busyTask,
  workspaceActive,
}: {
  tasks: WorkspaceTask[]

  onStatusChange: (task: WorkspaceTask, status: WorkspaceTask["status"]) => void

  busyTask: string
  workspaceActive: boolean
}) {
  if (!tasks.length) {
    return <EmptyMessage message="Tasks assigned to you will appear here." />
  }

  return (
    <>
      {tasks.map((task) => (
        <div className="task-table-row" key={task.id}>
          <span className="table-task">
            <span>
              <Link to={`/tasks/${task.id}`}>
                <strong>{task.title}</strong>
              </Link>
              <small>
                {task.number} · {task.project.title}
              </small>
            </span>
          </span>
          <select
            aria-label={`Update status for ${task.title}`}
            disabled={
              busyTask === task.id ||
              !workspaceActive ||
              task.status === "cancelled"
            }
            onChange={(event) =>
              onStatusChange(
                task,
                event.target.value as WorkspaceTask["status"],
              )
            }
            value={task.status}
          >
            {task.status === "cancelled" && (
              <option disabled value="cancelled">
                Cancelled
              </option>
            )}
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <span className={`priority priority-${task.priority}`}>
            <i />
            {task.priority}
          </span>
          <span>{formatTaskDateRange(task)}</span>
          <span>{task.project.title}</span>
          <span />
        </div>
      ))}
    </>
  )
}

function ProjectCard({ project }: { project: WorkspaceProject }) {
  return (
    <SectionCard className="project-card">
      <div className="project-card-top">
        <span className="project-key">{project.key}</span>
        <StatusPill status={project.status.replace("_", " ")} />
      </div>
      <h2>{project.title}</h2>
      <p>
        {project.description || "Project connected to your assigned tasks."}
      </p>
      <div className="project-card-footer">
        <Layers3 size={14} />
        <span>{project.space.name}</span>
        <span className="ml-auto">{formatDate(project.targetDate)}</span>
      </div>
    </SectionCard>
  )
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <FolderKanban size={28} />
      <p>{message}</p>
    </div>
  )
}
