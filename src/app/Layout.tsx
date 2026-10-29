import { useState } from "react"
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
import { clearSession, getSession } from "./api"
import { Avatar } from "./components"

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
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()

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

      <button className="workspace-switcher" type="button">
        <span className="workspace-icon">
          {session.activeWorkspace.name[0]}
        </span>
        <span>
          <strong>{session.activeWorkspace.name}</strong>
          <small>{session.activeWorkspace.role} workspace</small>
        </span>
        <ChevronDown size={15} />
      </button>

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
            {item.count && <em>{item.count}</em>}
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
        <div>
          <span className="space-dot bg-violet-400" />
          Product & Design <small>12</small>
        </div>
        <div>
          <span className="space-dot bg-sky-400" />
          Engineering <small>18</small>
        </div>
        <div>
          <span className="space-dot bg-amber-400" />
          Marketing <small>9</small>
        </div>
      </div>

      <div className="sidebar-footer">
        <NavLink to="/settings">
          <Settings size={18} />
          Settings
        </NavLink>
        <button type="button">
          <CircleHelp size={18} />
          Help & support
        </button>
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
          <label className="global-search">
            <Search size={18} />
            <input placeholder="Search tasks, projects, or people…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span />
            </button>
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
                  <button onClick={() => setCreateOpen(false)}>
                    <CheckSquare2 size={17} />
                    <span>
                      <strong>Task</strong>
                      <small>Plan a new piece of work</small>
                    </span>
                  </button>
                  <button onClick={() => setCreateOpen(false)}>
                    <FolderKanban size={17} />
                    <span>
                      <strong>Project</strong>
                      <small>Organize tasks and milestones</small>
                    </span>
                  </button>
                  <button onClick={() => setCreateOpen(false)}>
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
        <main key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
