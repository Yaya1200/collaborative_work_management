import { useMemo, useState } from "react"
import { Link } from "react-router"
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
  Filter,
  FolderKanban,
  ListFilter,
  MoreHorizontal,
  Plus,
  SearchX,
  Users,
} from "lucide-react"
import { activity, projects, tasks, type TaskStatus } from "./data"
import {
  Avatar,
  FilterButton,
  SearchField,
  SectionCard,
  StatusPill,
} from "./components"

const stats = [
  {
    label: "My open tasks",
    value: "8",
    detail: "3 due this week",
    icon: CheckCircle2,
    tone: "stat-indigo",
  },
  {
    label: "Overdue",
    value: "2",
    detail: "Needs attention",
    icon: Clock3,
    tone: "stat-red",
  },
  {
    label: "Blocked",
    value: "3",
    detail: "Across 2 projects",
    icon: AlertTriangle,
    tone: "stat-amber",
  },
  {
    label: "Awaiting review",
    value: "4",
    detail: "2 assigned to you",
    icon: CircleDot,
    tone: "stat-purple",
  },
]

export function DashboardPage() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Monday, October 26</p>
          <h1>Good morning, Alex</h1>
          <p>Here’s what’s happening across your workspace today.</p>
        </div>
        <button className="secondary-button">
          <Calendar size={17} />
          This week
        </button>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className={`stat-icon ${stat.tone}`}>
              <stat.icon size={19} />
            </div>
            <div>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </div>
            <ArrowUpRight size={17} />
          </div>
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
            {tasks.slice(0, 4).map((task) => (
              <Link className="task-row" to={`/tasks/${task.id}`} key={task.id}>
                <button
                  className="task-check"
                  aria-label={`Complete ${task.title}`}
                  onClick={(event) => event.preventDefault()}
                >
                  <Check size={14} />
                </button>
                <div className="task-main">
                  <strong>{task.title}</strong>
                  <span>
                    {task.key} · {task.project}
                  </span>
                </div>
                <StatusPill status={task.status} />
                <span
                  className={`due ${
                    task.dueLabel.includes("overdue") ? "due-overdue" : ""
                  }`}
                >
                  <Calendar size={14} />
                  {task.dueLabel}
                </span>
                <Avatar
                  initials={task.owner.initials}
                  className={task.owner.color}
                />
                <ChevronRight className="row-chevron" size={17} />
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent activity"
          className="activity-card"
          action={<button className="text-button">View all</button>}
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
              <Link to="/projects" className="project-row" key={project.key}>
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
          </div>
        </SectionCard>

        <SectionCard title="Upcoming deadlines" className="deadlines-card">
          <div className="deadline-date">
            <strong>27</strong>
            <span>
              OCT
              <br />
              TUE
            </span>
            <i />
          </div>
          <div className="deadline-item">
            <span className="space-dot bg-violet-500" />
            <div>
              <strong>Design handoff</strong>
              <small>Website Redesign</small>
            </div>
            <Avatar initials="NP" className="bg-emerald-100 text-emerald-700" />
          </div>
          <div className="deadline-item">
            <span className="space-dot bg-sky-500" />
            <div>
              <strong>Sprint 14 release</strong>
              <small>Mobile App v2</small>
            </div>
            <Avatar initials="MC" className="bg-amber-100 text-amber-700" />
          </div>
          <button className="calendar-link">
            Open calendar <ArrowRight size={14} />
          </button>
        </SectionCard>
      </div>
    </div>
  )
}

export function TasksPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<TaskStatus | "All">("All")
  const [view, setView] = useState<"list" | "board">("list")
  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (status === "All" || task.status === status) &&
          task.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, status],
  )

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
        <button className="primary-button">
          <Plus size={17} />
          New task
        </button>
      </div>
      <div className="toolbar">
        <label className="page-search">
          <SearchField placeholder="Search tasks" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search task text"
          />
        </label>
        <div className="filter-group">
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as TaskStatus | "All")
            }
            aria-label="Filter by status"
          >
            <option>All</option>
            <option>Backlog</option>
            <option>To do</option>
            <option>In progress</option>
            <option>In review</option>
            <option>Blocked</option>
          </select>
          <FilterButton>Priority</FilterButton>
          <button
            className={`view-button ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            <ListFilter size={16} />
            List
          </button>
          <button
            className={`view-button ${view === "board" ? "active" : ""}`}
            onClick={() => setView("board")}
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
              <Link
                className="task-table-row"
                to={`/tasks/${task.id}`}
                key={task.id}
              >
                <span className="table-task">
                  <i />
                  <span>
                    <strong>{task.title}</strong>
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
                    task.dueLabel.includes("overdue") ? "text-danger" : ""
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
                <MoreHorizontal size={17} />
              </Link>
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
        <TaskBoard />
      )}
    </div>
  )
}

function TaskBoard() {
  const columns: TaskStatus[] = [
    "Backlog",
    "To do",
    "In progress",
    "In review",
    "Blocked",
  ]
  return (
    <div className="task-board">
      {columns.map((column) => (
        <section className="board-column" key={column}>
          <div className="board-heading">
            <span>
              <i className={`dot-${column.toLowerCase().replace(" ", "-")}`} />
              {column}
            </span>
            <em>{tasks.filter((task) => task.status === column).length}</em>
            <button>
              <Plus size={15} />
            </button>
          </div>
          {tasks
            .filter((task) => task.status === column)
            .map((task) => (
              <article className="board-task" key={task.id}>
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
                    task.dueLabel.includes("overdue") ? "text-danger" : ""
                  }
                >
                  <Calendar size={13} />
                  {task.dueLabel}
                </span>
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}

export function ProjectsPage() {
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
        <button className="primary-button">
          <Plus size={17} />
          New project
        </button>
      </div>
      <div className="toolbar">
        <SearchField placeholder="Search projects" />
        <div className="filter-group">
          <FilterButton>All spaces</FilterButton>
          <FilterButton>All statuses</FilterButton>
          <button className="filter-button">
            <Filter size={15} />
            More filters
          </button>
        </div>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.key}>
            <div className="project-card-top">
              <span className={`project-tile ${project.color}`}>
                {project.key.slice(0, 2)}
              </span>
              <button>
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div>
              <span className="project-key">{project.key}</span>
              <h2>{project.name}</h2>
              <p>{project.space}</p>
            </div>
            <div className="project-meta">
              <StatusPill status={project.status} />
              <span>
                <Calendar size={14} />
                Due {project.due}
              </span>
            </div>
            <div className="project-card-progress">
              <div>
                <span>Progress</span>
                <strong>{project.progress}%</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${project.progress}%` }} />
              </div>
            </div>
            <div className="project-card-footer">
              <span>
                <CheckCircle2 size={15} />
                {project.tasks} tasks
              </span>
              <span>
                <Users size={15} />8 members
              </span>
              <button>
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            Workspace <ChevronRight size={13} /> {title}
          </p>
          <h1>{title}</h1>
          <p>This workspace area is ready for its API connection.</p>
        </div>
        <button className="primary-button">
          <Plus size={17} />
          Add new
        </button>
      </div>
      <SectionCard className="placeholder-card">
        <span>
          <FolderKanban size={30} />
        </span>
        <h2>{title} foundation is ready</h2>
        <p>
          The navigation, responsive shell and workspace context are in place.
          Connect MySQL to begin loading live records.
        </p>
        <button className="secondary-button">View implementation guide</button>
      </SectionCard>
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
