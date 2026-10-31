import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import { Calendar, Search, X } from "lucide-react"
import type { Project, Task, TaskStatus } from "./data"

export function Avatar({
  initials,
  className = "",
}: {
  initials: string
  className?: string
}) {
  return <span className={`avatar ${className}`}>{initials}</span>
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Blocked" || status === "At risk"
      ? "status-red"
      : status === "In progress" || status === "Active"
        ? "status-blue"
        : status === "In review"
          ? "status-purple"
          : status === "Done"
            ? "status-green"
            : status === "On hold"
              ? "status-amber"
              : "status-gray"
  return <span className={`status ${tone}`}>{status}</span>
}

export function SectionCard({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function SearchField({
  placeholder = "Search",
  value,
  onChange,
}: {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  )
}

export function CreateItemDialog({
  kind,
  projects,
  initialStatus,
  onClose,
  onCreate,
}: {
  kind: "task" | "project"
  projects: Project[]
  initialStatus?: TaskStatus
  onClose: () => void
  onCreate: (
    input:
      | {
          title: string
          project: string
          priority: Task["priority"]
          due: string
          status?: TaskStatus
        }
      | { name: string; space: string; due: string },
  ) => void
}) {
  const [error, setError] = useState("")

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      if (kind === "task") {
        onCreate({
          title: String(form.get("title") ?? ""),
          project: String(form.get("project") ?? ""),
          priority: String(form.get("priority") ?? "Medium") as Task["priority"],
          due: String(form.get("due") ?? ""),
          status: initialStatus,
        })
      } else {
        onCreate({
          name: String(form.get("name") ?? ""),
          space: String(form.get("space") ?? ""),
          due: String(form.get("due") ?? ""),
        })
      }
      onClose()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save this item.",
      )
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="create-dialog-title"
        aria-modal="true"
        className="create-dialog"
        role="dialog"
      >
        <div className="create-dialog-heading">
          <div>
            <h2 id="create-dialog-title">
              New {kind === "task" ? "task" : "project"}
            </h2>
            <p>
              {kind === "task"
                ? "Add a task to your workspace."
                : "Set up a project for your team."}
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          {kind === "task" ? (
            <>
              <label className="form-field">
                <span>Task name</span>
                <div>
                  <input autoFocus maxLength={240} name="title" required />
                </div>
              </label>
              <label className="form-field">
                <span>Project</span>
                <div>
                  <select name="project" required>
                    {projects.map((project) => (
                      <option key={project.key} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                    {!projects.length && <option value="General">General</option>}
                  </select>
                </div>
              </label>
              <label className="form-field">
                <span>Priority</span>
                <div>
                  <select defaultValue="Medium" name="priority">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </label>
            </>
          ) : (
            <>
              <label className="form-field">
                <span>Project name</span>
                <div>
                  <input autoFocus maxLength={180} name="name" required />
                </div>
              </label>
              <label className="form-field">
                <span>Space</span>
                <div>
                  <input maxLength={140} name="space" placeholder="General" />
                </div>
              </label>
            </>
          )}
          <label className="form-field">
            <span>Due date <em>Optional</em></span>
            <div>
              <Calendar size={16} />
              <input name="due" type="date" />
            </div>
          </label>
          <div className="create-dialog-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Create {kind}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
