import { createBrowserRouter } from "react-router"
import { AuthPage } from "./auth-pages"
import { Layout } from "./Layout"
import { OnboardingPage } from "./onboarding"
import {
  DashboardPage,
  NotFoundPage,
  PlaceholderPage,
  ProjectsPage,
  TasksPage,
} from "./pages"

export const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  { path: "/onboarding", Component: OnboardingPage },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "tasks", Component: TasksPage },
      { path: "tasks/:taskId", Component: TasksPage },
      { path: "projects", Component: ProjectsPage },
      { path: "calendar", element: <PlaceholderPage title="Calendar" /> },
      { path: "inbox", element: <PlaceholderPage title="Inbox" /> },
      { path: "spaces", element: <PlaceholderPage title="Spaces" /> },
      { path: "teams", element: <PlaceholderPage title="Teams" /> },
      { path: "settings", element: <PlaceholderPage title="Settings" /> },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
