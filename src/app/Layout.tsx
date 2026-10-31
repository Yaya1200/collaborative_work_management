import { useEffect, useRef, useState } from "react"
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router"
import {
  Bell,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { clearSession, getSession, saveSession } from "./api"
import { Avatar, CreateItemDialog } from "./components"
import { activity } from "./data"
import { createProject, createTask, useWorkspaceData } from "./store"

const primary = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/tasks", label: "My tasks", icon: CheckSquare2, count: 8 },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/inbox", label: "Inbox", icon: Inbox, count: 4 },
]

const workspace = [
  { to: "/spaces", label: "Spaces", icon: Sparkles },
  { to: "/teams", label: "Teams", icon: Users },
]

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<"task" | "project" | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const data = useWorkspaceData()

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }
      if (event.key === "Escape") setSearchOpen(false)
    }

    window.addEventListener("keydown", handleSearchShortcut)
    return () => window.removeEventListener("keydown", handleSearchShortcut)
  }, [])

  if (!session) return <Navigate to="/login" replace />
  if (!session.activeWorkspace) return <Navigate to="/onboarding" replace />

  const initials = session.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const sidebar = (
    <>
      <div className="brand">
        <span className="brand-mark">
          <span />
        </span>
        <span>Northstar</span>
        <button
          className="icon-button sidebar-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="workspace-switcher-wrap">
        <button
          aria-expanded={workspaceOpen}
          className="workspace-switcher"
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          type="button"
        >
          <span className="workspace-icon">
            {session.activeWorkspace.name[0]}
          </span>
          <span>
            <strong>{session.activeWorkspace.name}</strong>
            <small>{session.activeWorkspace.role} workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        {workspaceOpen && (
          <div className="workspace-menu">
            <p>Switch workspace</p>
            {session.workspaces.map((workspace) => (
              <button
                className={
                  workspace.id === session.activeWorkspace?.id ? "selected" : ""
                }
                key={workspace.id}
                onClick={() => {
                  saveSession({ ...session, activeWorkspace: workspace })
                  setWorkspaceOpen(false)
                }}
                type="button"
              >
                <span className="workspace-icon">{workspace.name[0]}</span>
                <span>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.role}</small>
                </span>
              </button>
            ))}
            <button
              className="workspace-add"
              onClick={() => navigate("/onboarding?new=1")}
              type="button"
            >
              <Plus size={15} /> Create workspace
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {(item.to === "/tasks"
              ? data.tasks.filter((task) => task.status !== "Done").length
              : item.count ?? 0) > 0 && (
              <em>
                {item.to === "/tasks"
                  ? data.tasks.filter((task) => task.status !== "Done").length
                  : item.count ?? 0}
              </em>
            )}
          </NavLink>
        ))}
        <p className="nav-label">Workspace</p>
        {workspace.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spaces">
        <button onClick={() => navigate("/projects?space=Product%20%26%20Design")} type="button">
          <span className="space-dot bg-violet-400" />
          Product & Design <small>12</small>
        </button>
        <button onClick={() => navigate("/projects?space=Engineering")} type="button">
          <span className="space-dot bg-sky-400" />
          Engineering <small>18</small>
        </button>
        <button onClick={() => navigate("/projects?space=Marketing")} type="button">
          <span className="space-dot bg-amber-400" />
          Marketing <small>9</small>
        </button>
      </div>

      <div className="sidebar-footer">
        <NavLink to="/settings">
          <Settings size={18} />
          Settings
        </NavLink>
        <a href="mailto:support@northstar.app?subject=Northstar%20support">
          <CircleHelp size={18} />
          Help & support
        </a>
        <div className="user-row">
          <Avatar
            initials={initials}
            className="bg-violet-100 text-violet-700"
          />
          <span>
            <strong>{session.user.name}</strong>
            <small>
              {session.demo ? "Demo workspace" : session.user.email}
            </small>
          </span>
          <button
            className="signout-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              clearSession()
              navigate("/login")
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        {sidebar}
      </aside>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="global-search-wrap">
            <form
              className="global-search"
              onSubmit={(event) => {
                event.preventDefault()
                navigate(`/tasks?search=${encodeURIComponent(searchQuery)}`)
                setSearchOpen(false)
              }}
            >
              <button
                aria-label="Open search"
                className="global-search-trigger"
                onClick={() => {
                  setSearchOpen(true)
                  searchInputRef.current?.focus()
                }}
                type="button"
              >
                <Search size={18} />
              </button>
              <input
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search tasks, projects, or people…"
                ref={searchInputRef}
                value={searchQuery}
              />
              <kbd>⌘ K</kbd>
            </form>
            {searchOpen && searchQuery.trim() && (
              <div className="global-search-results">
                {data.tasks
                  .filter((task) =>
                    `${task.title} ${task.key} ${task.project}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                  .slice(0, 4)
                  .map((task) => (
                    <button
                      key={task.id}
                      onMouseDown={() => {
                        navigate(`/tasks/${task.id}`)
                        setSearchQuery("")
                        setSearchOpen(false)
                      }}
                      type="button"
                    >
                      <CheckSquare2 size={16} />
                      <span><strong>{task.title}</strong><small>{task.key} · {task.project}</small></span>
                    </button>
                  ))}
                {data.projects
                  .filter((project) =>
                    `${project.name} ${project.key} ${project.space}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                  .slice(0, 3)
                  .map((project) => (
                    <button
                      key={project.key}
                      onMouseDown={() => {
                        navigate(`/projects?search=${encodeURIComponent(project.name)}`)
                        setSearchQuery("")
                        setSearchOpen(false)
                      }}
                      type="button"
                    >
                      <FolderKanban size={16} />
                      <span><strong>{project.name}</strong><small>{project.space}</small></span>
                    </button>
                  ))}
                {!data.tasks.some((task) =>
                  `${task.title} ${task.key} ${task.project}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                ) && !data.projects.some((project) =>
                  `${project.name} ${project.key} ${project.space}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                ) && <p>No matching tasks or projects.</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="notification-wrap">
              <button
                aria-expanded={notificationsOpen}
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                type="button"
              >
                <Bell size={19} />
                {!notificationsOpen && <span />}
              </button>
              {notificationsOpen && (
                <div className="notification-menu">
                  <div><strong>Recent activity</strong><button onClick={() => setNotificationsOpen(false)} type="button" aria-label="Close notifications"><X size={15} /></button></div>
                  {activity.slice(0, 3).map((item) => (
                    <p key={item.text}><Avatar initials={item.initials} className={item.tone} />{item.text}<small>{item.time}</small></p>
                  ))}
                  <button className="text-button" onClick={() => { setNotificationsOpen(false); navigate("/inbox") }} type="button">View inbox</button>
                </div>
              )}
            </div>
            <div className="create-wrap">
              <button
                className="primary-button"
                onClick={() => setCreateOpen(!createOpen)}
                type="button"
              >
                <Plus size={17} />
                Create
              </button>
              {createOpen && (
                <div className="create-menu">
                  <button onClick={() => { setCreateKind("task"); setCreateOpen(false) }}>
                    <CheckSquare2 size={17} />
                    <span>
                      <strong>Task</strong>
                      <small>Plan a new piece of work</small>
                    </span>
                  </button>
                  <button onClick={() => { setCreateKind("project"); setCreateOpen(false) }}>
                    <FolderKanban size={17} />
                    <span>
                      <strong>Project</strong>
                      <small>Organize tasks and milestones</small>
                    </span>
                  </button>
                  <button onClick={() => { setCreateOpen(false); navigate("/teams") }}>
                    <Users size={17} />
                    <span>
                      <strong>Team</strong>
                      <small>Bring collaborators together</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main key={`${location.pathname}${location.search}`}>
          <Outlet />
        </main>
      </div>
      {createKind && (
        <CreateItemDialog
          kind={createKind}
          onClose={() => setCreateKind(null)}
          onCreate={(input) => {
            if ("title" in input) createTask(input)
            else createProject(input)
          }}
          projects={data.projects}
        />
      )}
    </div>
  )
}
