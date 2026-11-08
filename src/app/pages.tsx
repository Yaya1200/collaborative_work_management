import { useEffect, useMemo, useState } from "react"

import { Link, useNavigate, useParams, useSearchParams } from "react-router"

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FolderKanban,
  Inbox,
  ListFilter,
  MoreHorizontal,
  Plus,
  SearchX,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { type Project, type Task, type TaskStatus } from "./data"

import {
  Avatar,
  CreateItemDialog,
  SearchField,
  SectionCard,
  StatusPill,
} from "./components"

import { useWorkspaceData } from "./store"

import {
  api,
  ApiError,
  getSession,
  type Developer,
  type WorkspaceProject,
  type WorkspaceTask,
} from "./api"

const taskStatuses: TaskStatus[] = [
  "Backlog",

  "To do",

  "In progress",

  "In review",

  "Blocked",

  "Done",
]

function dateLabel(date: string) {
  if (!date) return "No due date"

  const parsed = new Date(`${date}T00:00:00`)

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function todayString() {
  const today = new Date()

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
}

function taskStatusLabel(status: WorkspaceTask["status"]): TaskStatus {
  const labels: Record<WorkspaceTask["status"], TaskStatus> = {
    backlog: "Backlog",
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    blocked: "Blocked",
    done: "Done",
  }
  return labels[status]
}

function taskForDisplay(task: WorkspaceTask): Task {
  const nameParts = task.owner.name.split(/\s+/)
  const initials = nameParts
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const due = task.dueDate?.slice(0, 10) ?? ""

  return {
    id: task.id,
    key: task.number,
    title: task.title,
    project: task.project.title,
    status: taskStatusLabel(task.status),
    priority: (task.priority[0].toUpperCase() +
      task.priority.slice(1)) as Task["priority"],
    due,
    dueLabel: due ? dateLabel(due) : "No due date",
    owner: {
      name: task.owner.name,
      initials,
      color: "bg-violet-100 text-violet-700",
    },
    progress: task.progressPct,
  }
}

const statDefinitions = [
  {
    label: "My open tasks",

    detail: "Tasks not yet completed",

    icon: CheckCircle2,

    tone: "stat-indigo",

    href: "/tasks?status=All",
  },

  {
    label: "Overdue",

    detail: "Needs attention",

    icon: Clock3,

    tone: "stat-red",

    href: "/tasks?overdue=true",
  },

  {
    label: "Blocked",

    detail: "Tasks needing help",

    icon: AlertTriangle,

    tone: "stat-amber",

    href: "/tasks?status=Blocked",
  },

  {
    label: "Awaiting review",

    detail: "Ready for review",

    icon: CircleDot,

    tone: "stat-purple",

    href: "/tasks?status=In%20review",
  },
]

export function DashboardPage() {
  const today = todayString()
  const todayDate = new Date()
  const session = getSession()
  const isAdmin = ["project_manager", "owner"].includes(
    session?.activeWorkspace?.role ?? "",
  )
  const workspaceId = session?.activeWorkspace?.id
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTask[]>([])
  const [workspaceProjects, setWorkspaceProjects] =
    useState<WorkspaceProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError("")
    Promise.all([
      api.listWorkspaceTasks(workspaceId),
      api.listWorkspaceProjects(workspaceId),
    ])
      .then(([taskResult, projectResult]) => {
        if (!active) return
        setWorkspaceTasks(taskResult.data)
        setWorkspaceProjects(projectResult.data)
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load workspace overview.",
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

  const myTasks = workspaceTasks
    .filter((task) => task.owner.id === session?.user.id)
    .map(taskForDisplay)
  const myOpenTasks = myTasks.filter((task) => task.status !== "Done")
  const overdueTasks = myOpenTasks.filter(
    (task) => task.due && task.due < today,
  )
  const blockedTasks = myTasks.filter((task) => task.status === "Blocked")
  const reviewTasks = myTasks.filter((task) => task.status === "In review")

  const stats = [
    myOpenTasks.length,
    overdueTasks.length,
    blockedTasks.length,
    reviewTasks.length,
  ]

  const upcoming = myOpenTasks
    .filter((task) => task.due && task.due >= today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 2)

  async function toggleTask(task: Task) {
    if (!workspaceId) return
    const status = task.status === "Done" ? "todo" : "done"
    try {
      const result = await api.updateTaskStatus(workspaceId, task.id, status)
      setWorkspaceTasks((current) =>
        current.map((item) => (item.id === task.id ? result.data : item)),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update task status.",
      )
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {todayDate.toLocaleDateString(undefined, {
              weekday: "long",

              month: "long",

              day: "numeric",
            })}
          </p>
          <h1>Good morning, {session?.user.name.split(" ")[0] ?? "there"}</h1>
          <p>Here’s what’s happening across your workspace today.</p>
        </div>
        <Link className="secondary-button" to="/calendar">
          <Calendar size={17} />
          This week
        </Link>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {loading && <p className="empty-copy">Loading workspace overview…</p>}
      {!isAdmin && (
        <div className="stat-grid">
          {statDefinitions.map((stat, index) => (
            <Link
              className="stat-card stat-card-link"
              key={stat.label}
              to={stat.href}
            >
              <div className={`stat-icon ${stat.tone}`}>
                <stat.icon size={19} />
              </div>
              <div>
                <p>{stat.label}</p>
                <strong>{stats[index]}</strong>
                <small>{stat.detail}</small>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      )}

      <div className="dashboard-grid">
        {!isAdmin && (
          <SectionCard
            title="My work"
            className="my-work"
            action={
              <Link to="/tasks">
                View all <ArrowRight size={14} />
              </Link>
            }
          >
            <div className="task-list">
              {myTasks.slice(0, 4).map((task) => (
                <div className="task-row" key={task.id}>
                  <button
                    aria-label={
                      task.status === "Done"
                        ? `Reopen ${task.title}`
                        : `Complete ${task.title}`
                    }
                    className={`task-check ${
                      task.status === "Done" ? "is-done" : ""
                    }`}
                    onClick={() => void toggleTask(task)}
                    type="button"
                  >
                    <Check size={14} />
                  </button>
                  <div className="task-main">
                    <Link to={`/tasks/${task.id}`}>
                      <strong>{task.title}</strong>
                    </Link>
                    <span>
                      {task.key} · {task.project}
                    </span>
                  </div>
                  <StatusPill status={task.status} />
                  <span
                    className={`due ${
                      task.due && task.due < today ? "due-overdue" : ""
                    }`}
                  >
                    <Calendar size={14} />
                    {task.dueLabel}
                  </span>
                  <Avatar
                    initials={task.owner.initials}
                    className={task.owner.color}
                  />
                  <Link
                    aria-label={`Open ${task.title}`}
                    className="row-chevron"
                    to={`/tasks/${task.id}`}
                  >
                    <ChevronRight size={17} />
                  </Link>
                </div>
              ))}
              {!myTasks.length && (
                <div className="empty-state">
                  <CheckCircle2 size={30} />
                  <h3>You’re all caught up</h3>
                  <p>Tasks assigned to you will appear here.</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Workspace updates"
          className="activity-card"
          action={
            <Link className="text-button" to="/inbox">
              View all
            </Link>
          }
        >
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <h3>No new activity</h3>
            <p>Updates from your workspace will appear here.</p>
          </div>
        </SectionCard>

        <SectionCard
          title="Project momentum"
          className="project-momentum"
          action={
            <Link to="/projects">
              All projects <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="project-list">
            {workspaceProjects.slice(0, 3).map((project) => {
              const projectTasks = workspaceTasks.filter(
                (task) => task.project.id === project.id,
              )
              const completedCount = projectTasks.filter(
                (task) => task.status === "done",
              ).length
              const progress = projectTasks.length
                ? Math.round((completedCount / projectTasks.length) * 100)
                : 0

              return (
                <Link
                  className="project-row"
                  key={project.id}
                  to={`/projects?search=${encodeURIComponent(project.title)}`}
                >
                  <span className="project-tile bg-indigo-500">
                    {project.key.slice(0, 2)}
                  </span>
                  <div className="project-main">
                    <strong>{project.title}</strong>
                    <span>{project.space.name}</span>
                    <div className="progress-track">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="project-progress">
                    <strong>{progress}%</strong>
                    <span>{projectTasks.length} tasks</span>
                  </div>
                </Link>
              )
            })}
            {!workspaceProjects.length && (
              <p className="empty-copy">Create a project to track progress.</p>
            )}
          </div>
        </SectionCard>

        {!isAdmin && (
          <SectionCard title="Upcoming deadlines" className="deadlines-card">
            {upcoming.map((task) => (
              <Link
                className="deadline-item deadline-link"
                key={task.id}
                to={`/tasks/${task.id}`}
              >
                <span
                  className={`space-dot ${task.owner.color.split(" ")[0]}`}
                />
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.project} · {dateLabel(task.due)}
                  </small>
                </div>
                <Avatar
                  initials={task.owner.initials}
                  className={task.owner.color}
                />
              </Link>
            ))}
            {!upcoming.length && (
              <p className="empty-copy">No upcoming deadlines.</p>
            )}
            <Link className="calendar-link" to="/calendar">
              Open calendar <ArrowRight size={14} />
            </Link>
          </SectionCard>
        )}
      </div>
    </div>
  )
}

export function TasksPage() {
  const { taskId } = useParams()

  const [searchParams] = useSearchParams()

  const session = getSession()
  const workspaceId = session?.activeWorkspace?.id
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [query, setQuery] = useState(searchParams.get("search") ?? "")

  const [status, setStatus] = useState(searchParams.get("status") ?? "All")

  const [priority, setPriority] = useState("All")

  const [view, setView] = useState<"list" | "board">("list")

  const tasks = workspaceTasks
    .filter((task) => task.owner.id === session?.user.id)
    .map(taskForDisplay)
  const selectedTask = tasks.find((task) => task.id === taskId)

  const overdueOnly = searchParams.get("overdue") === "true"

  const projectFilter = searchParams.get("project")

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError("")
    api
      .listWorkspaceTasks(workspaceId)
      .then((result) => {
        if (active) setWorkspaceTasks(result.data)
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load your tasks.",
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

  async function changeTaskStatus(task: Task, nextStatus: TaskStatus) {
    if (!workspaceId) return
    const status = {
      Backlog: "backlog",
      "To do": "todo",
      "In progress": "in_progress",
      "In review": "in_review",
      Blocked: "blocked",
      Done: "done",
    }[nextStatus] as WorkspaceTask["status"]

    try {
      const result = await api.updateTaskStatus(workspaceId, task.id, status)
      setWorkspaceTasks((current) =>
        current.map((item) => (item.id === task.id ? result.data : item)),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update task status.",
      )
    }
  }

  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (status === "All" || task.status === status) &&
          (priority === "All" || task.priority === priority) &&
          (!overdueOnly || (task.due && task.due < todayString())) &&
          (!projectFilter || task.project === projectFilter) &&
          `${task.title} ${task.key} ${task.project}`

            .toLowerCase()

            .includes(query.toLowerCase()),
      ),

    [overdueOnly, priority, projectFilter, query, status, tasks],
  )

  if (taskId) {
    return selectedTask ? (
      <TaskDetail task={selectedTask} onStatusChange={changeTaskStatus} />
    ) : (
      <div className="page">
        <div className="empty-state">
          <SearchX size={32} />
          <h3>{loading ? "Loading task…" : "Task not found"}</h3>
          <p>
            {loading
              ? "Finding your task."
              : "This task may have been removed or isn’t assigned to your account."}
          </p>
          <Link to="/tasks">Back to tasks</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            Workspace <ChevronRight size={13} /> My tasks
          </p>
          <h1>My tasks</h1>
          <p>Prioritize and track the work assigned to you.</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchField
          onChange={setQuery}
          placeholder="Search tasks"
          value={query}
        />
        <div className="filter-group">
          <select
            aria-label="Filter by status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option>All</option>
            {taskStatuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            onChange={(event) => setPriority(event.target.value)}
            value={priority}
          >
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <button
            className={`view-button ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            type="button"
          >
            <ListFilter size={16} />
            List
          </button>
          <button
            className={`view-button ${view === "board" ? "active" : ""}`}
            onClick={() => setView("board")}
            type="button"
          >
            <FolderKanban size={16} />
            Board
          </button>
        </div>
      </div>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {loading && <p className="empty-copy">Loading your tasks…</p>}
      {view === "list" ? (
        <SectionCard className="task-table-card">
          <div className="task-table-header">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due date</span>
            <span>Owner</span>
            <span />
          </div>
          {filtered.length ? (
            filtered.map((task) => (
              <div className="task-table-row" key={task.id}>
                <span className="table-task">
                  <button
                    aria-label={
                      task.status === "Done"
                        ? `Reopen ${task.title}`
                        : `Complete ${task.title}`
                    }
                    className={`task-check ${
                      task.status === "Done" ? "is-done" : ""
                    }`}
                    onClick={() =>
                      void changeTaskStatus(
                        task,
                        task.status === "Done" ? "To do" : "Done",
                      )
                    }
                    type="button"
                  >
                    <Check size={14} />
                  </button>
                  <span>
                    <Link to={`/tasks/${task.id}`}>
                      <strong>{task.title}</strong>
                    </Link>
                    <small>
                      {task.key} · {task.project}
                    </small>
                  </span>
                </span>
                <StatusPill status={task.status} />
                <span
                  className={`priority priority-${task.priority.toLowerCase()}`}
                >
                  <i />
                  {task.priority}
                </span>
                <span
                  className={
                    task.due && task.due < todayString() ? "text-danger" : ""
                  }
                >
                  {task.dueLabel}
                </span>
                <span className="owner-cell">
                  <Avatar
                    initials={task.owner.initials}
                    className={task.owner.color}
                  />
                  {task.owner.name}
                </span>
                <Link
                  aria-label={`View ${task.title}`}
                  to={`/tasks/${task.id}`}
                >
                  <MoreHorizontal size={17} />
                </Link>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <SearchX size={32} />
              <h3>No matching tasks</h3>
              <p>Try another search or clear your filters.</p>
            </div>
          )}
        </SectionCard>
      ) : (
        <TaskBoard tasks={filtered} />
      )}
    </div>
  )
}

function TaskDetail({
  task,
  onStatusChange,
}: {
  task: Task
  onStatusChange: (task: Task, status: TaskStatus) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            <Link to="/tasks">My tasks</Link> <ChevronRight size={13} />{" "}
            {task.key}
          </p>
          <h1>{task.title}</h1>
          <p>
            {task.key} · {task.project}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => navigate("/tasks")}
          type="button"
        >
          Back to tasks
        </button>
      </div>
      <SectionCard className="task-detail-card" title="Task details">
        <label className="form-field">
          <span>Status</span>
          <div>
            <select
              onChange={(event) =>
                onStatusChange(task, event.target.value as TaskStatus)
              }
              value={task.status}
            >
              {taskStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </label>
        <p>
          <strong>Priority:</strong> {task.priority}
        </p>
        <p>
          <strong>Due date:</strong> {task.dueLabel}
        </p>
        <p>
          <strong>Assigned to:</strong> {task.owner.name}
        </p>
        <p>
          <strong>Progress:</strong> {task.progress}%
        </p>
      </SectionCard>
    </div>
  )
}

function TaskBoard({ tasks }: { tasks: Task[] }) {
  return (
    <div className="task-board">
      {taskStatuses.map((column) => (
        <section className="board-column" key={column}>
          <div className="board-heading">
            <span>
              <i className={`dot-${column.toLowerCase().replace(" ", "-")}`} />
              {column}
            </span>
            <em>{tasks.filter((task) => task.status === column).length}</em>
          </div>
          {tasks

            .filter((task) => task.status === column)

            .map((task) => (
              <Link
                className="board-task"
                key={task.id}
                to={`/tasks/${task.id}`}
              >
                <small>{task.key}</small>
                <strong>{task.title}</strong>
                <div>
                  <span
                    className={`priority priority-${task.priority.toLowerCase()}`}
                  >
                    <i />
                    {task.priority}
                  </span>
                  <Avatar
                    initials={task.owner.initials}
                    className={task.owner.color}
                  />
                </div>
                <span
                  className={
                    task.due && task.due < todayString() ? "text-danger" : ""
                  }
                >
                  <Calendar size={13} />
                  {task.dueLabel}
                </span>
              </Link>
            ))}
        </section>
      ))}
    </div>
  )
}

export function ProjectsPage() {
  const [searchParams] = useSearchParams()
  const session = getSession()
  const workspaceId = session?.activeWorkspace?.id
  const canManageProjects = ["project_manager", "owner"].includes(
    session?.activeWorkspace?.role ?? "",
  )
  const canCreateTasks =
    session?.activeWorkspace?.role === "project_manager"
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [query, setQuery] = useState(searchParams.get("search") ?? "")
  const [space, setSpace] = useState(searchParams.get("space") ?? "All spaces")
  const [status, setStatus] = useState("All statuses")
  const [createOpen, setCreateOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectSpace, setProjectSpace] = useState("")
  const [projectStartDate, setProjectStartDate] = useState("")
  const [projectEndDate, setProjectEndDate] = useState("")
  const [taskProject, setTaskProject] = useState<WorkspaceProject | null>(null)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskDeveloperId, setTaskDeveloperId] = useState("")
  const [taskPriority, setTaskPriority] =
    useState<WorkspaceTask["priority"]>("medium")
  const [taskStartDate, setTaskStartDate] = useState("")
  const [taskEndDate, setTaskEndDate] = useState("")
  const [taskPending, setTaskPending] = useState(false)

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError("")
    setProjects([])
    setTasks([])
    Promise.all([
      api.listWorkspaceProjects(workspaceId),
      api.listWorkspaceTasks(workspaceId),
      canManageProjects
        ? api.listDevelopers(workspaceId)
        : Promise.resolve({ data: [] as Developer[] }),
    ])
      .then(([projectResult, taskResult, developerResult]) => {
        if (!active) return
        setProjects(projectResult.data)
        setTasks(taskResult.data)
        setDevelopers(developerResult.data)
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load workspace projects.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [workspaceId, canManageProjects])

  const spaces = [...new Set(projects.map((project) => project.space.name))]

  const filtered = projects.filter(
    (project) =>
      (space === "All spaces" || project.space.name === space) &&
      (status === "All statuses" || project.status === status) &&
      `${project.key} ${project.title} ${project.space.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId) return

    setPending(true)
    setError("")
    setFieldErrors({})
    try {
      const result = await api.createWorkspaceProject(workspaceId, {
        name: projectName,
        space: projectSpace,
        startDate: projectStartDate,
        targetDate: projectEndDate,
      })
      setProjects((current) => [result.data, ...current])
      setProjectName("")
      setProjectSpace("")
      setProjectStartDate("")
      setProjectEndDate("")
      setCreateOpen(false)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fields ?? {})
      } else {
        setError("Unable to create the project.")
      }
    } finally {
      setPending(false)
    }
  }

  async function changeProjectStatus(
    project: WorkspaceProject,
    nextStatus: WorkspaceProject["status"],
  ) {
    if (!workspaceId) return
    setError("")
    try {
      const result = await api.updateWorkspaceProjectStatus(
        workspaceId,
        project.id,
        nextStatus,
      )
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? result.data : item)),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update project status.",
      )
    }
  }

  async function deleteProject(project: WorkspaceProject) {
    if (!workspaceId) return
    const taskCount = tasks.filter(
      (task) => task.project.id === project.id,
    ).length
    const taskWarning = taskCount
      ? ` This will also permanently delete its ${taskCount} task${
          taskCount === 1 ? "" : "s"
        }.`
      : ""
    if (
      !window.confirm(
        `Delete "${project.title}"?${taskWarning} This cannot be undone.`,
      )
    ) {
      return
    }

    setDeletingProjectId(project.id)
    setError("")
    try {
      await api.deleteWorkspaceProject(workspaceId, project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      setTasks((current) =>
        current.filter((task) => task.project.id !== project.id),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to delete the project.",
      )
    } finally {
      setDeletingProjectId("")
    }
  }

  async function submitProjectTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId || !taskProject) return
    setTaskPending(true)
    setError("")
    setFieldErrors({})
    try {
      const result = await api.createAssignedTask(workspaceId, {
        title: taskTitle,
        description: taskDescription,
        projectId: taskProject.id,
        developerId: taskDeveloperId,
        priority: taskPriority,
        status: "todo",
        startDate: taskStartDate,
        dueDate: taskEndDate,
      })
      setTasks((current) => [result.data, ...current])
      setTaskProject(null)
      setTaskTitle("")
      setTaskDescription("")
      setTaskDeveloperId("")
      setTaskPriority("medium")
      setTaskStartDate("")
      setTaskEndDate("")
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fields ?? {})
      } else {
        setError("Unable to create the assigned task.")
      }
    } finally {
      setTaskPending(false)
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            Workspace <ChevronRight size={13} /> Projects
          </p>
          <h1>Projects</h1>
          <p>Plan, monitor and deliver work across every team.</p>
        </div>
        {canManageProjects && (
          <button
            className="primary-button"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Plus size={17} />
            New project
          </button>
        )}
      </div>
      {error && !createOpen && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      <div className="toolbar">
        <SearchField
          onChange={setQuery}
          placeholder="Search projects"
          value={query}
        />
        <div className="filter-group">
          <select
            aria-label="Filter by space"
            onChange={(event) => setSpace(event.target.value)}
            value={space}
          >
            <option>All spaces</option>
            {spaces.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option>All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="project-grid">
        {filtered.map((project) => {
          const projectTasks = tasks.filter(
            (task) => task.project.id === project.id,
          )
          const developersCount = new Set(
            projectTasks.map((task) => task.owner.id),
          ).size
          const completedTasks = projectTasks.filter(
            (task) => task.status === "done",
          ).length

          return (
            <ProjectCard
              canAddTasks={canCreateTasks}
              canManage={canManageProjects}
              deleting={deletingProjectId === project.id}
              developerCount={developersCount}
              key={project.id}
              onDelete={() => void deleteProject(project)}
              onAddTask={() => {
                setError("")
                setFieldErrors({})
                setTaskProject(project)
              }}
              onStatusChange={(nextStatus) =>
                void changeProjectStatus(project, nextStatus)
              }
              progress={
                projectTasks.length
                  ? Math.round((completedTasks / projectTasks.length) * 100)
                  : 0
              }
              project={project}
              taskCount={projectTasks.length}
            />
          )
        })}
        {!loading && !filtered.length && (
          <div className="empty-state">
            <SearchX size={32} />
            <h3>
              {projects.length ? "No matching projects" : "No projects yet"}
            </h3>
            <p>
              {projects.length
                ? "Try another search or change your filters."
                : "Create a project to start organizing workspace tasks."}
            </p>
          </div>
        )}
        {loading && <p className="empty-copy">Loading projects…</p>}
      </div>
      {createOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false)
          }}
        >
          <section
            aria-labelledby="create-project-title"
            aria-modal="true"
            className="create-dialog"
            role="dialog"
          >
            <div className="create-dialog-heading">
              <div>
                <h2 id="create-project-title">New project</h2>
                <p>Set up a project in your workspace.</p>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                onClick={() => setCreateOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitProject}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <label className="form-field">
                <span>Project name</span>
                <div>
                  <input
                    autoFocus
                    maxLength={180}
                    onChange={(event) => setProjectName(event.target.value)}
                    required
                    value={projectName}
                  />
                </div>
                {fieldErrors.name && <small>{fieldErrors.name[0]}</small>}
              </label>
              <label className="form-field">
                <span>Space</span>
                <div>
                  <input
                    list="workspace-project-spaces"
                    maxLength={140}
                    onChange={(event) => setProjectSpace(event.target.value)}
                    required
                    value={projectSpace}
                  />
                  <datalist id="workspace-project-spaces">
                    {spaces.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
                {fieldErrors.space && <small>{fieldErrors.space[0]}</small>}
              </label>
              <label className="form-field">
                <span>
                  Start date <em>Optional</em>
                </span>
                <div>
                  <input
                    max={projectEndDate || undefined}
                    onChange={(event) =>
                      setProjectStartDate(event.target.value)
                    }
                    type="date"
                    value={projectStartDate}
                  />
                </div>
                {fieldErrors.startDate && (
                  <small>{fieldErrors.startDate[0]}</small>
                )}
              </label>
              <label className="form-field">
                <span>
                  End date <em>Optional</em>
                </span>
                <div>
                  <input
                    min={projectStartDate || undefined}
                    onChange={(event) => setProjectEndDate(event.target.value)}
                    type="date"
                    value={projectEndDate}
                  />
                </div>
                {fieldErrors.targetDate && (
                  <small>{fieldErrors.targetDate[0]}</small>
                )}
              </label>
              <div className="create-dialog-actions">
                <button
                  className="secondary-button"
                  onClick={() => setCreateOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {taskProject && canCreateTasks && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTaskProject(null)
          }}
        >
          <section
            aria-labelledby="create-project-task-title"
            aria-modal="true"
            className="create-dialog"
            role="dialog"
          >
            <div className="create-dialog-heading">
              <div>
                <h2 id="create-project-task-title">Add task</h2>
                <p>
                  Create a task in {taskProject.title} and assign a developer.
                </p>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                onClick={() => setTaskProject(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitProjectTask}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <label className="form-field">
                <span>Task title</span>
                <div>
                  <input
                    autoFocus
                    maxLength={240}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    required
                    value={taskTitle}
                  />
                </div>
                {fieldErrors.title && <small>{fieldErrors.title[0]}</small>}
              </label>
              <label className="form-field">
                <span>
                  Description <em>Optional</em>
                </span>
                <div>
                  <textarea
                    maxLength={5000}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    rows={3}
                    value={taskDescription}
                  />
                </div>
              </label>
              <label className="form-field">
                <span>Developer</span>
                <div>
                  <select
                    onChange={(event) => setTaskDeveloperId(event.target.value)}
                    required
                    value={taskDeveloperId}
                  >
                    <option value="">Choose a developer</option>
                    {developers.map((developer) => (
                      <option key={developer.id} value={developer.id}>
                        {developer.name}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.developerId && (
                  <small>{fieldErrors.developerId[0]}</small>
                )}
              </label>
              <label className="form-field">
                <span>Priority</span>
                <div>
                  <select
                    onChange={(event) =>
                      setTaskPriority(
                        event.target.value as WorkspaceTask["priority"],
                      )
                    }
                    value={taskPriority}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </label>
              <label className="form-field">
                <span>
                  Start date <em>Optional</em>
                </span>
                <div>
                  <input
                    max={taskEndDate || undefined}
                    onChange={(event) => setTaskStartDate(event.target.value)}
                    type="date"
                    value={taskStartDate}
                  />
                </div>
                {fieldErrors.startDate && (
                  <small>{fieldErrors.startDate[0]}</small>
                )}
              </label>
              <label className="form-field">
                <span>
                  End date <em>Optional</em>
                </span>
                <div>
                  <input
                    min={taskStartDate || undefined}
                    onChange={(event) => setTaskEndDate(event.target.value)}
                    type="date"
                    value={taskEndDate}
                  />
                </div>
                {fieldErrors.dueDate && <small>{fieldErrors.dueDate[0]}</small>}
              </label>
              <div className="create-dialog-actions">
                <button
                  className="secondary-button"
                  onClick={() => setTaskProject(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={taskPending || !developers.length}
                  type="submit"
                >
                  {taskPending ? "Creating…" : "Create task"}
                </button>
              </div>
              {!developers.length && (
                <p className="empty-copy">
                  Add a developer before creating an assigned task.
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  taskCount,
  developerCount,
  progress,
  canAddTasks,
  canManage,
  deleting,
  onAddTask,
  onStatusChange,
  onDelete,
}: {
  project: WorkspaceProject
  taskCount: number
  developerCount: number
  progress: number
  canAddTasks: boolean
  canManage: boolean
  deleting: boolean
  onAddTask: () => void
  onStatusChange: (status: WorkspaceProject["status"]) => void
  onDelete: () => void
}) {
  const statuses: WorkspaceProject["status"][] = [
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled",
  ]
  const statusLabels: Record<WorkspaceProject["status"], string> = {
    planning: "Planning",
    active: "Active",
    on_hold: "On hold",
    completed: "Completed",
    cancelled: "Cancelled",
  }
  const dates =
    project.startDate && project.targetDate
      ? `${dateLabel(project.startDate)} – ${dateLabel(project.targetDate)}`
      : project.startDate
        ? `Starts ${dateLabel(project.startDate)}`
        : project.targetDate
          ? `Ends ${dateLabel(project.targetDate)}`
          : "No dates"

  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className="project-tile bg-indigo-500">
          {project.key.slice(0, 2)}
        </span>
        {(canManage || canAddTasks) && (
          <div className="flex items-center gap-1">
            {canAddTasks && (
              <button
                aria-label={`Add task to ${project.title}`}
                className="icon-button"
                onClick={onAddTask}
                title="Add task"
                type="button"
              >
                <Plus size={16} />
              </button>
            )}
            {canManage && (
              <button
                aria-label={`Delete ${project.title}`}
                className="icon-button"
                disabled={deleting}
                onClick={onDelete}
                title="Delete project"
                type="button"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      <div>
        <span className="project-key">{project.key}</span>
        <h2>
          <Link to={`/projects?search=${encodeURIComponent(project.title)}`}>
            {project.title}
          </Link>
        </h2>
        <p>{project.space.name}</p>
      </div>
      <div className="project-meta">
        {canManage ? (
          <select
            aria-label={`Status for ${project.title}`}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600"
            onChange={(event) =>
              onStatusChange(event.target.value as WorkspaceProject["status"])
            }
            value={project.status}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        ) : (
          <StatusPill status={statusLabels[project.status]} />
        )}
        <span>
          <Calendar size={14} /> {dates}
        </span>
      </div>
      <div className="project-card-progress">
        <div>
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="project-card-footer">
        <span>
          <CheckCircle2 size={15} />
          {taskCount} tasks
        </span>
        <span>
          <Users size={15} />
          {developerCount} {developerCount === 1 ? "developer" : "developers"}
        </span>
        <Link
          aria-label={`View tasks for ${project.title}`}
          to={`/projects?search=${encodeURIComponent(project.title)}`}
        >
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}

export function CalendarPage() {
  const workspaceId = getSession()?.activeWorkspace?.id
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    let active = true
    api
      .listWorkspaceTasks(workspaceId)
      .then((result) => {
        if (active) {
          const currentUserId = getSession()?.user.id
          setTasks(
            result.data.filter((task) => task.owner.id === currentUserId),
          )
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load calendar tasks.",
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

  const today = todayString()
  const scheduledTasks = tasks
    .filter((task) => {
      const lastScheduledDate = task.dueDate || task.startDate
      return lastScheduledDate !== null && lastScheduledDate >= today
    })
    .sort((left, right) =>
      (left.startDate || left.dueDate || "").localeCompare(
        right.startDate || right.dueDate || "",
      ),
    )

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            Workspace <ChevronRight size={13} /> Calendar
          </p>
          <h1>Calendar</h1>
          <p>Upcoming tasks and deadlines from your workspace.</p>
        </div>
      </div>
      <SectionCard className="placeholder-content" title="Upcoming work">
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <p className="empty-copy">Loading scheduled tasks…</p>
        ) : scheduledTasks.length ? (
          scheduledTasks.map((task) => (
            <div className="placeholder-row" key={task.id}>
              <Calendar size={17} />
              <span>
                <strong>{task.title}</strong>
                <small>
                  {task.project.space?.name ?? "No space"} ·{" "}
                  {task.project.title}
                  {" · "}
                  {task.startDate
                    ? `Starts ${dateLabel(task.startDate)}`
                    : "No start date"}
                  {" · "}
                  {task.dueDate
                    ? `Ends ${dateLabel(task.dueDate)}`
                    : "No end date"}
                  {" · "}
                  {task.owner.name} · {task.priority} priority
                </small>
              </span>
              <StatusPill
                status={task.status
                  .split("_")
                  .map((part, index) =>
                    index === 0 ? part[0].toUpperCase() + part.slice(1) : part,
                  )
                  .join(" ")}
              />
            </div>
          ))
        ) : (
          <p className="empty-copy">
            No upcoming scheduled tasks. Tasks with start or end dates will
            appear here.
          </p>
        )}
      </SectionCard>
    </div>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()

  const { tasks, projects } = useWorkspaceData()

  const session = getSession()

  const action = title === "Teams" ? "Invite member" : undefined

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            Workspace <ChevronRight size={13} /> {title}
          </p>
          <h1>{title}</h1>
          <p>
            {title === "Inbox"
              ? "Recent updates from your workspace."
              : title === "Spaces"
                ? "Projects grouped by their workspace space."
                : title === "Teams"
                  ? "People collaborating across your projects."
                  : "Manage your workspace account and preferences."}
          </p>
        </div>
        {action && (
          <button
            className="primary-button"
            onClick={() => {
              if (title === "Teams") {
                window.location.href =
                  "mailto:team@northstar.app?subject=Workspace%20invitation"
              }
            }}
            type="button"
          >
            <Plus size={17} />
            {action}
          </button>
        )}
      </div>
      {title === "Inbox" && (
        <SectionCard className="inbox-empty">
          <span className="inbox-empty-icon">
            <Inbox size={24} />
          </span>
          <h2>Your inbox is clear</h2>
          <p>New messages and workspace updates will show up here.</p>
        </SectionCard>
      )}
      {title === "Spaces" && (
        <SectionCard className="placeholder-content" title="Your spaces">
          {[...new Set(projects.map((project) => project.space))].map(
            (spaceName) => (
              <button
                className="placeholder-row"
                key={spaceName}
                onClick={() =>
                  navigate(`/projects?space=${encodeURIComponent(spaceName)}`)
                }
                type="button"
              >
                <FolderKanban size={17} />
                <span>
                  <strong>{spaceName}</strong>
                  <small>
                    {
                      projects.filter((project) => project.space === spaceName)
                        .length
                    }{" "}
                    projects
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ),
          )}
          {!projects.length && (
            <p className="empty-copy">
              Spaces will appear here when projects are added to your workspace.
            </p>
          )}
        </SectionCard>
      )}
      {title === "Teams" && (
        <SectionCard className="placeholder-content" title="Workspace members">
          {[
            ...new Map(
              tasks.map((task) => [task.owner.name, task.owner]),
            ).values(),
          ].map((owner) => (
            <div className="placeholder-row" key={owner.name}>
              <Avatar initials={owner.initials} className={owner.color} />
              <span>
                <strong>{owner.name}</strong>
                <small>
                  {
                    tasks.filter((task) => task.owner.name === owner.name)
                      .length
                  }{" "}
                  assigned tasks
                </small>
              </span>
            </div>
          ))}
          {!tasks.length && (
            <p className="empty-copy">Invite people to start collaborating.</p>
          )}
        </SectionCard>
      )}
      {title === "Settings" && (
        <SectionCard className="placeholder-content" title="Your account">
          <div className="placeholder-row">
            <Users size={17} />
            <span>
              <strong>{session?.user.name}</strong>
              <small>{session?.user.email}</small>
            </span>
          </div>
          <div className="placeholder-row">
            <FolderKanban size={17} />
            <span>
              <strong>{session?.activeWorkspace?.name}</strong>
              <small>{session?.activeWorkspace?.role} workspace</small>
            </span>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="not-found">
      <strong>404</strong>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link to="/">Return to overview</Link>
    </div>
  )
}
