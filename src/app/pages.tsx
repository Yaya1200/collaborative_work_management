import { useMemo, useState } from "react"
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
  ListFilter,
  MoreHorizontal,
  Plus,
  SearchX,
  Users,
} from "lucide-react"
import { activity, type Project, type Task, type TaskStatus } from "./data"
import {
  Avatar,
  CreateItemDialog,
  SearchField,
  SectionCard,
  StatusPill,
} from "./components"
import {
  createProject,
  createTask,
  setProjectStatus,
  setTaskStatus,
  useWorkspaceData,
} from "./store"
import { getSession } from "./api"

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
  const { tasks, projects } = useWorkspaceData()
  const today = todayString()
  const todayDate = new Date()
  const session = getSession()
  const openTasks = tasks.filter((task) => task.status !== "Done")
  const overdueTasks = openTasks.filter((task) => task.due && task.due < today)
  const blockedTasks = tasks.filter((task) => task.status === "Blocked")
  const reviewTasks = tasks.filter((task) => task.status === "In review")
  const myTasks = openTasks.filter(
    (task) => task.owner.name === session?.user.name,
  )
  const stats = [myTasks.length, overdueTasks.length, blockedTasks.length, reviewTasks.length]
  const upcoming = openTasks
    .filter((task) => task.due >= today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 2)

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

      <div className="stat-grid">
        {statDefinitions.map((stat, index) => (
          <Link className="stat-card stat-card-link" key={stat.label} to={stat.href}>
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

      <div className="dashboard-grid">
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
                  className={`task-check ${task.status === "Done" ? "is-done" : ""}`}
                  onClick={() =>
                    setTaskStatus(
                      task.id,
                      task.status === "Done" ? "To do" : "Done",
                    )
                  }
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
                  className={`due ${task.due && task.due < today ? "due-overdue" : ""}`}
                >
                  <Calendar size={14} />
                  {task.dueLabel}
                </span>
                <Avatar initials={task.owner.initials} className={task.owner.color} />
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

        <SectionCard
          title="Recent activity"
          className="activity-card"
          action={
            <Link className="text-button" to="/inbox">
              View all
            </Link>
          }
        >
          <div className="activity-list">
            {activity.map((item) => (
              <div className="activity-row" key={item.text}>
                <Avatar initials={item.initials} className={item.tone} />
                <p>
                  {item.text}
                  <span>{item.time}</span>
                </p>
              </div>
            ))}
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
            {projects.slice(0, 3).map((project) => (
              <Link
                className="project-row"
                key={project.key}
                to={`/tasks?project=${encodeURIComponent(project.name)}`}
              >
                <span className={`project-tile ${project.color}`}>
                  {project.key.slice(0, 2)}
                </span>
                <div className="project-main">
                  <strong>{project.name}</strong>
                  <span>{project.space}</span>
                  <div className="progress-track">
                    <i style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <div className="project-progress">
                  <strong>{project.progress}%</strong>
                  <span>{project.tasks} tasks</span>
                </div>
              </Link>
            ))}
            {!projects.length && <p className="empty-copy">Create a project to track progress.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming deadlines" className="deadlines-card">
          {upcoming.map((task) => (
            <Link className="deadline-item deadline-link" key={task.id} to={`/tasks/${task.id}`}>
              <span className={`space-dot ${task.owner.color.split(" ")[0]}`} />
              <div>
                <strong>{task.title}</strong>
                <small>{task.project} · {dateLabel(task.due)}</small>
              </div>
              <Avatar initials={task.owner.initials} className={task.owner.color} />
            </Link>
          ))}
          {!upcoming.length && <p className="empty-copy">No upcoming deadlines.</p>}
          <Link className="calendar-link" to="/calendar">
            Open calendar <ArrowRight size={14} />
          </Link>
        </SectionCard>
      </div>
    </div>
  )
}

export function TasksPage() {
  const { taskId } = useParams()
  const [searchParams] = useSearchParams()
  const { tasks, projects } = useWorkspaceData()
  const [query, setQuery] = useState(searchParams.get("search") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "All")
  const [priority, setPriority] = useState("All")
  const [view, setView] = useState<"list" | "board">("list")
  const [createStatus, setCreateStatus] = useState<TaskStatus | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const selectedTask = tasks.find((task) => task.id === taskId)
  const overdueOnly = searchParams.get("overdue") === "true"
  const projectFilter = searchParams.get("project")
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
      <TaskDetail task={selectedTask} />
    ) : (
      <div className="page">
        <div className="empty-state">
          <SearchX size={32} />
          <h3>Task not found</h3>
          <p>This task may have been removed.</p>
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
        <button
          className="primary-button"
          onClick={() => {
            setCreateStatus(undefined)
            setCreateOpen(true)
          }}
          type="button"
        >
          <Plus size={17} />
          New task
        </button>
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
            {taskStatuses.map((item) => <option key={item}>{item}</option>)}
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
                    aria-label={task.status === "Done" ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    className={`task-check ${task.status === "Done" ? "is-done" : ""}`}
                    onClick={() => setTaskStatus(task.id, task.status === "Done" ? "To do" : "Done")}
                    type="button"
                  >
                    <Check size={14} />
                  </button>
                  <span>
                    <Link to={`/tasks/${task.id}`}>
                      <strong>{task.title}</strong>
                    </Link>
                    <small>{task.key} · {task.project}</small>
                  </span>
                </span>
                <StatusPill status={task.status} />
                <span className={`priority priority-${task.priority.toLowerCase()}`}>
                  <i />
                  {task.priority}
                </span>
                <span className={task.due && task.due < todayString() ? "text-danger" : ""}>
                  {task.dueLabel}
                </span>
                <span className="owner-cell">
                  <Avatar initials={task.owner.initials} className={task.owner.color} />
                  {task.owner.name}
                </span>
                <Link aria-label={`View ${task.title}`} to={`/tasks/${task.id}`}>
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
        <TaskBoard
          tasks={filtered}
          onAdd={(column) => {
            setCreateStatus(column)
            setCreateOpen(true)
          }}
        />
      )}
      {createOpen && (
        <CreateItemDialog
          initialStatus={createStatus}
          kind="task"
          onClose={() => setCreateOpen(false)}
          onCreate={(input) => {
            if ("title" in input) createTask(input)
          }}
          projects={projects}
        />
      )}
    </div>
  )
}

function TaskDetail({ task }: { task: Task }) {
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            <Link to="/tasks">My tasks</Link> <ChevronRight size={13} /> {task.key}
          </p>
          <h1>{task.title}</h1>
          <p>{task.key} · {task.project}</p>
        </div>
        <button className="secondary-button" onClick={() => navigate("/tasks")} type="button">
          Back to tasks
        </button>
      </div>
      <SectionCard className="task-detail-card" title="Task details">
        <label className="form-field">
          <span>Status</span>
          <div>
            <select
              onChange={(event) => setTaskStatus(task.id, event.target.value as TaskStatus)}
              value={task.status}
            >
              {taskStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </label>
        <p><strong>Priority:</strong> {task.priority}</p>
        <p><strong>Due date:</strong> {task.dueLabel}</p>
        <p><strong>Assigned to:</strong> {task.owner.name}</p>
        <p><strong>Progress:</strong> {task.progress}%</p>
      </SectionCard>
    </div>
  )
}

function TaskBoard({
  tasks,
  onAdd,
}: {
  tasks: Task[]
  onAdd: (status: TaskStatus) => void
}) {
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
            <button aria-label={`Add task in ${column}`} onClick={() => onAdd(column)} type="button">
              <Plus size={15} />
            </button>
          </div>
          {tasks
            .filter((task) => task.status === column)
            .map((task) => (
              <Link className="board-task" key={task.id} to={`/tasks/${task.id}`}>
                <small>{task.key}</small>
                <strong>{task.title}</strong>
                <div>
                  <span className={`priority priority-${task.priority.toLowerCase()}`}>
                    <i />
                    {task.priority}
                  </span>
                  <Avatar initials={task.owner.initials} className={task.owner.color} />
                </div>
                <span className={task.due && task.due < todayString() ? "text-danger" : ""}>
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
  const { projects, tasks } = useWorkspaceData()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("search") ?? "")
  const [space, setSpace] = useState(searchParams.get("space") ?? "All spaces")
  const [status, setStatus] = useState("All statuses")
  const [createOpen, setCreateOpen] = useState(false)
  const spaces = [...new Set(projects.map((project) => project.space))]
  const filtered = projects.filter(
    (project) =>
      (space === "All spaces" || project.space === space) &&
      (status === "All statuses" || project.status === status) &&
      `${project.key} ${project.name} ${project.space}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )

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
        <button className="primary-button" onClick={() => setCreateOpen(true)} type="button">
          <Plus size={17} />
          New project
        </button>
      </div>
      <div className="toolbar">
        <SearchField onChange={setQuery} placeholder="Search projects" value={query} />
        <div className="filter-group">
          <select aria-label="Filter by space" onChange={(event) => setSpace(event.target.value)} value={space}>
            <option>All spaces</option>
            {spaces.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option>All statuses</option>
            <option>Active</option>
            <option>At risk</option>
            <option>On hold</option>
            <option>Completed</option>
          </select>
        </div>
      </div>
      <div className="project-grid">
        {filtered.map((project) => (
          <ProjectCard
            key={project.key}
            onStatusChange={(nextStatus) => setProjectStatus(project.key, nextStatus)}
            project={project}
            taskCount={tasks.filter((task) => task.project === project.name).length || project.tasks}
          />
        ))}
        {!filtered.length && (
          <div className="empty-state">
            <SearchX size={32} />
            <h3>No matching projects</h3>
            <p>Try another search or create a new project.</p>
          </div>
        )}
      </div>
      {createOpen && (
        <CreateItemDialog
          kind="project"
          onClose={() => setCreateOpen(false)}
          onCreate={(input) => {
            if ("name" in input) createProject(input)
          }}
          projects={projects}
        />
      )}
    </div>
  )
}

function ProjectCard({
  project,
  taskCount,
  onStatusChange,
}: {
  project: Project
  taskCount: number
  onStatusChange: (status: Project["status"]) => void
}) {
  const statuses: Project["status"][] = ["Active", "At risk", "On hold", "Completed"]
  const nextStatus =
    statuses[(statuses.indexOf(project.status) + 1) % statuses.length]
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className={`project-tile ${project.color}`}>{project.key.slice(0, 2)}</span>
        <button
          aria-label={`Change ${project.name} status to ${nextStatus}`}
          onClick={() => onStatusChange(nextStatus)}
          title={`Change status to ${nextStatus}`}
          type="button"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div>
        <span className="project-key">{project.key}</span>
        <h2>
          <Link to={`/tasks?project=${encodeURIComponent(project.name)}`}>{project.name}</Link>
        </h2>
        <p>{project.space}</p>
      </div>
      <div className="project-meta">
        <StatusPill status={project.status} />
        <span><Calendar size={14} /> Due {project.due}</span>
      </div>
      <div className="project-card-progress">
        <div><span>Progress</span><strong>{project.progress}%</strong></div>
        <div className="progress-track"><i style={{ width: `${project.progress}%` }} /></div>
      </div>
      <div className="project-card-footer">
        <span><CheckCircle2 size={15} />{taskCount} tasks</span>
        <span><Users size={15} />8 members</span>
        <Link aria-label={`View tasks for ${project.name}`} to={`/tasks?project=${encodeURIComponent(project.name)}`}>
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()
  const { tasks, projects } = useWorkspaceData()
  const [createOpen, setCreateOpen] = useState(false)
  const [read, setRead] = useState(false)
  const session = getSession()
  const dueTasks = tasks
    .filter((task) => task.status !== "Done" && task.due >= todayString())
    .sort((a, b) => a.due.localeCompare(b.due))

  const action =
    title === "Calendar" || title === "Spaces"
      ? title === "Calendar"
        ? "Add task"
        : "Add project"
      : title === "Teams"
        ? "Invite member"
        : undefined

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">Workspace <ChevronRight size={13} /> {title}</p>
          <h1>{title}</h1>
          <p>
            {title === "Calendar"
              ? "Upcoming work and deadlines across your workspace."
              : title === "Inbox"
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
                window.location.href = "mailto:team@northstar.app?subject=Workspace%20invitation"
              } else {
                setCreateOpen(true)
              }
            }}
            type="button"
          >
            <Plus size={17} />
            {action}
          </button>
        )}
      </div>
      {title === "Calendar" && (
        <SectionCard className="placeholder-content" title="Upcoming deadlines">
          {dueTasks.map((task) => (
            <Link className="placeholder-row" key={task.id} to={`/tasks/${task.id}`}>
              <Calendar size={17} />
              <span><strong>{task.title}</strong><small>{task.project} · {dateLabel(task.due)}</small></span>
              <StatusPill status={task.status} />
            </Link>
          ))}
          {!dueTasks.length && <p className="empty-copy">No upcoming deadlines. Add a task with a due date to see it here.</p>}
        </SectionCard>
      )}
      {title === "Inbox" && (
        <SectionCard className="placeholder-content" title="Recent activity" action={
          <button className="text-button" onClick={() => setRead(true)} type="button">
            {read ? "All caught up" : "Mark all as read"}
          </button>
        }>
          {activity.map((item) => (
            <div className={`placeholder-row ${read ? "is-read" : ""}`} key={item.text}>
              <Avatar initials={item.initials} className={item.tone} />
              <span><strong>{item.text}</strong><small>{item.time}</small></span>
            </div>
          ))}
        </SectionCard>
      )}
      {title === "Spaces" && (
        <SectionCard className="placeholder-content" title="Your spaces">
          {[...new Set(projects.map((project) => project.space))].map((spaceName) => (
            <button className="placeholder-row" key={spaceName} onClick={() => navigate(`/projects?space=${encodeURIComponent(spaceName)}`)} type="button">
              <FolderKanban size={17} />
              <span><strong>{spaceName}</strong><small>{projects.filter((project) => project.space === spaceName).length} projects</small></span>
              <ArrowRight size={16} />
            </button>
          ))}
          {!projects.length && <p className="empty-copy">Create a project to start organizing spaces.</p>}
        </SectionCard>
      )}
      {title === "Teams" && (
        <SectionCard className="placeholder-content" title="Workspace members">
          {[...new Map(tasks.map((task) => [task.owner.name, task.owner])).values()].map((owner) => (
            <div className="placeholder-row" key={owner.name}>
              <Avatar initials={owner.initials} className={owner.color} />
              <span><strong>{owner.name}</strong><small>{tasks.filter((task) => task.owner.name === owner.name).length} assigned tasks</small></span>
            </div>
          ))}
          {!tasks.length && <p className="empty-copy">Invite people to start collaborating.</p>}
        </SectionCard>
      )}
      {title === "Settings" && (
        <SectionCard className="placeholder-content" title="Your account">
          <div className="placeholder-row">
            <Users size={17} />
            <span><strong>{session?.user.name}</strong><small>{session?.user.email}</small></span>
          </div>
          <div className="placeholder-row">
            <FolderKanban size={17} />
            <span><strong>{session?.activeWorkspace?.name}</strong><small>{session?.activeWorkspace?.role} workspace</small></span>
          </div>
        </SectionCard>
      )}
      {createOpen && (
        <CreateItemDialog
          kind={title === "Spaces" ? "project" : "task"}
          onClose={() => setCreateOpen(false)}
          onCreate={(input) => {
            if ("title" in input) createTask(input)
            else createProject(input)
          }}
          projects={projects}
        />
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
