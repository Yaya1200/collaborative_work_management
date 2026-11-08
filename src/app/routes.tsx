import { createBrowserRouter, Navigate } from "react-router"
import {
  DeveloperPortalPage,
  type DeveloperPortalView,
} from "./developer-portal"
import { getSession } from "./api"
import { AuthPage } from "./auth-pages"
import { Layout } from "./Layout"
import { OnboardingPage } from "./onboarding"
import { TeamPage } from "./team-page"
import { SpacesPage } from "./spaces-page"
import {
  CalendarPage,
  DashboardPage,
  NotFoundPage,
  PlaceholderPage,
  ProjectsPage,
  TasksPage,
} from "./pages"

function RolePage({
  view,
  children,
}: {
  view?: DeveloperPortalView
  children: React.ReactNode
}) {
  const role = getSession()?.activeWorkspace?.role
  if (role === "member") {
    return view ? (
      <DeveloperPortalPage view={view} />
    ) : (
      <Navigate to="/tasks" replace />
    )
  }
  return children
}

export const router = createBrowserRouter([
  { path: "/login", Component: AuthPage },
  { path: "/register", element: <AuthPage initialMode="signup" /> },
  { path: "/onboarding", Component: OnboardingPage },
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        element: (
          <RolePage view="dashboard">
            <DashboardPage />
          </RolePage>
        ),
      },
      {
        path: "tasks",
        element: (
          <RolePage view="tasks">
            <TasksPage />
          </RolePage>
        ),
      },
      {
        path: "tasks/:taskId",
        element: (
          <RolePage view="tasks">
            <TasksPage />
          </RolePage>
        ),
      },
      {
        path: "projects",
        element: (
          <RolePage view="projects">
            <ProjectsPage />
          </RolePage>
        ),
      },
      {
        path: "calendar",
        element: (
          <RolePage>
            <CalendarPage />
          </RolePage>
        ),
      },
      {
        path: "inbox",
        element: (
          <RolePage>
            <PlaceholderPage title="Inbox" />
          </RolePage>
        ),
      },
      {
        path: "spaces",
        element: (
          <RolePage view="spaces">
            <SpacesPage />
          </RolePage>
        ),
      },
      { path: "teams", Component: TeamPage },
      {
        path: "settings",
        element: (
          <RolePage>
            <PlaceholderPage title="Settings" />
          </RolePage>
        ),
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
