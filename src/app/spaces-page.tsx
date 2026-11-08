import { type FormEvent, useEffect, useState } from "react"

import { AlertCircle, FolderKanban, Layers3, Plus, X } from "lucide-react"

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
  const canCreateSpace =
    session?.activeWorkspace?.role === "project_manager" &&
    session.activeWorkspace.isActive !== false

  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([])

  const [projects, setProjects] = useState<WorkspaceProject[]>([])

  const [createOpen, setCreateOpen] = useState(false)

  const [spaceName, setSpaceName] = useState("")

  const [spaceDescription, setSpaceDescription] = useState("")

  const [pending, setPending] = useState(false)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

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

  async function createSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId) return

    setPending(true)
    setError("")
    setFieldErrors({})
    try {
      const result = await api.createWorkspaceSpace(workspaceId, {
        name: spaceName,
        description: spaceDescription,
      })
      setSpaces((current) =>
        [...current.filter((space) => space.id !== result.data.id), result.data]
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      setSpaceName("")
      setSpaceDescription("")
      setCreateOpen(false)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fields ?? {})
      } else {
        setError("Unable to create the space.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            {session?.activeWorkspace?.name ?? "Workspace"} <span>›</span>{" "}
            Spaces
          </p>
          <h1>Spaces</h1>
          <p>Organize your workspace projects into dedicated spaces.</p>
        </div>
        {canCreateSpace && (
          <button
            className="primary-button"
            onClick={() => {
              setError("")
              setFieldErrors({})
              setCreateOpen(true)
            }}
            type="button"
          >
            <Plus size={17} /> New space
          </button>
        )}
      </div>

      {error && !createOpen && (
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
          <p>
            {canCreateSpace
              ? "Create a space to organize projects for your team."
              : "Spaces created for this workspace will appear here."}
          </p>
        </div>
      )}
      {createOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false)
          }}
        >
          <section
            aria-labelledby="create-space-title"
            aria-modal="true"
            className="create-dialog"
            role="dialog"
          >
            <div className="create-dialog-heading">
              <div>
                <h2 id="create-space-title">New space</h2>
                <p>Create a place to group related projects.</p>
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
            <form onSubmit={createSpace}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <label className="form-field">
                <span>Space name</span>
                <div>
                  <input
                    autoFocus
                    maxLength={140}
                    onChange={(event) => setSpaceName(event.target.value)}
                    required
                    value={spaceName}
                  />
                </div>
                {fieldErrors.name && <small>{fieldErrors.name[0]}</small>}
              </label>
              <label className="form-field">
                <span>Description <em>Optional</em></span>
                <div>
                  <input
                    maxLength={1000}
                    onChange={(event) =>
                      setSpaceDescription(event.target.value)
                    }
                    value={spaceDescription}
                  />
                </div>
                {fieldErrors.description && (
                  <small>{fieldErrors.description[0]}</small>
                )}
              </label>
              <div className="create-dialog-actions">
                <button
                  className="secondary-button"
                  disabled={pending}
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
                  {pending ? "Creating…" : "Create space"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
