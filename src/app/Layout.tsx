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
import { Avatar } from "./components"
import { useWorkspaceData } from "./store"

const primary = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/tasks", label: "My tasks", icon: CheckSquare2 },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/inbox", label: "Inbox", icon: Inbox },
]

const workspace = [
  { to: "/spaces", label: "Spaces", icon: Sparkles },
  { to: "/teams", label: "Team", icon: Users },
]

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
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
      if (event.key === "Escape") {
        setSearchOpen(false)
        setMobileOpen(false)
      }
    }

    window.addEventListener("keydown", handleSearchShortcut)
    return () => window.removeEventListener("keydown", handleSearchShortcut)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (!session) return <Navigate to="/login" replace />
  if (!session.activeWorkspace) return <Navigate to="/onboarding" replace />

  const isDeveloper = session.activeWorkspace.role === "member"
  const isOwner = session.activeWorkspace.role === "owner"
  const workspaceRole = session.activeWorkspace.role
  const visiblePrimary = isOwner
    ? primary.filter((item) => item.to === "/")
    : isDeveloper
      ? primary.filter((item) =>
          ["/", "/tasks", "/projects"].includes(item.to),        )
      : primary
  const visibleWorkspace = isDeveloper
    ? []
    : isOwner
      ? workspace.filter((item) => item.to === "/teams")
      : workspace

  if (isOwner && !["/", "/teams"].includes(location.pathname)) {
    return <Navigate to="/" replace />
  }

  const initials = session.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const sidebar = (
    <>
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
                  const currentSession = getSession() ?? session
                  const selectedWorkspace =
                    currentSession.workspaces.find(
                      (item) => item.id === workspace.id,
                    ) ?? workspace
                  saveSession({
                    ...currentSession,
                    activeWorkspace: selectedWorkspace,
                  })
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
            {!isDeveloper && (
              <button
                className="workspace-add"
                onClick={() => navigate("/onboarding?new=1")}
                type="button"
              >
                <Plus size={15} /> Create workspace
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {visiblePrimary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon size={18} />
            <span>
              {item.to === "/tasks" &&
              workspaceRole === "project_manager"
                ? "Tasks"
                : item.label}
            </span>
          </NavLink>
        ))}
        {visibleWorkspace.length > 0 && (
          <p className="nav-label">Workspace</p>
        )}
        {visibleWorkspace.map((item) => (
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

      <div className="sidebar-footer">
        {!isOwner && (
          <NavLink to="/settings">
            <Settings size={18} />
            Settings
          </NavLink>
        )}
        <div className="user-row">
          <Avatar
            initials={initials}
            className="bg-violet-100 text-violet-700"
          />
          <span>
            <strong>{session.user.name}</strong>
            <small>{session.user.email}</small>
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
      <aside
        className={`sidebar ${mobileOpen ? "is-open" : ""}`}
        id="workspace-sidebar"
      >
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
            aria-controls="workspace-sidebar"
            aria-expanded={mobileOpen}
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            type="button"
          >
            <Menu size={20} />
          </button>
          {!isOwner && <div className="global-search-wrap">
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
                onBlur={() =>
                  window.setTimeout(() => setSearchOpen(false), 120)
                }
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={
                  isDeveloper
                    ? "Search my tasks…"
                    : "Search tasks, projects, or people…"
                }
                ref={searchInputRef}
                value={searchQuery}
              />
              <kbd>⌘ K</kbd>
            </form>
            {!isDeveloper && searchOpen && searchQuery.trim() && (
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
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {task.key} · {task.project}
                        </small>
                      </span>
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
                        navigate(
                          `/projects?search=${encodeURIComponent(project.name)}`,
                        )
                        setSearchQuery("")
                        setSearchOpen(false)
                      }}
                      type="button"
                    >
                      <FolderKanban size={16} />
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.space}</small>
                      </span>
                    </button>
                  ))}
                {!data.tasks.some((task) =>
                  `${task.title} ${task.key} ${task.project}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                ) &&
                  !data.projects.some((project) =>
                    `${project.name} ${project.key} ${project.space}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  ) && <p>No matching tasks or projects.</p>}
              </div>
            )}
          </div>}
          <div className="topbar-actions">
            {!isDeveloper && !isOwner && (
              <div className="notification-wrap">
                <button
                  aria-expanded={notificationsOpen}
                  className="icon-button notification-button"
                  aria-label="Notifications"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  type="button"
                >
                  <Bell size={19} />
                </button>
                {notificationsOpen && (
                  <div className="notification-menu">
                    <div>
                      <strong>Notifications</strong>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        type="button"
                        aria-label="Close notifications"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <p className="notification-empty">
                      You’re all caught up. New updates will appear here.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setNotificationsOpen(false)
                        navigate("/inbox")
                      }}
                      type="button"
                    >
                      Open inbox
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main key={`${location.pathname}${location.search}`}>
          {session.activeWorkspace.isActive === false && (
            <div className="auth-error" role="status">
              This workspace is deactivated and read-only. Ask its Owner to
              reactivate it.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
