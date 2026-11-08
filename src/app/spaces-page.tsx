import { useEffect, useState } from "react"

import { AlertCircle, FolderKanban, Layers3 } from "lucide-react"

import { Link } from "react-router"

import {
  api,
  ApiError,
  getSession,
  type WorkspaceProject,
  type WorkspaceSpace,
} from "./api"

import { SectionCard } from "./components"

export function SpacesPage() {
  const session = getSession()

  const workspaceId = session?.activeWorkspace?.id

  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([])

  const [projects, setProjects] = useState<WorkspaceProject[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)

      setError("Choose a workspace to view its spaces.")

      return
    }

    let active = true

    setLoading(true)

    setError("")

    Promise.all([
      api.listWorkspaceSpaces(workspaceId),

      api.listWorkspaceProjects(workspaceId),
    ])

      .then(([spaceResult, projectResult]) => {
        if (!active) return

        setSpaces(spaceResult.data)

        setProjects(projectResult.data)
      })

      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load workspace spaces.",
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

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            {session?.activeWorkspace?.name ?? "Workspace"} <span>›</span>{" "}
            Spaces
          </p>
          <h1>Spaces</h1>
          <p>Projects grouped by their workspace space.</p>
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {loading ? (
        <p className="empty-copy">Loading spaces…</p>
      ) : spaces.length ? (
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
                  {space.description || `${relatedProjects.length} projects`}
                </p>
                <div className="placeholder-content">
                  {relatedProjects.map((project) => (
                    <Link
                      className="placeholder-row"
                      key={project.id}
                      to={`/projects?search=${encodeURIComponent(project.title)}`}
                    >
                      <FolderKanban size={15} />
                      <span>
                        <strong>{project.title}</strong>
                        <small>
                          {project.key} · {project.status}
                        </small>
                      </span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Layers3 size={30} />
          <h3>No spaces yet</h3>
          <p>Create a project and space from the Teams page to see it here.</p>
        </div>
      )}
    </div>
  )
}
