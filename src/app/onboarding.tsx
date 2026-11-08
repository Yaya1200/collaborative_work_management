import { type FormEvent, useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  Check,
  LoaderCircle,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Navigate, useNavigate, useSearchParams } from "react-router"
import { api, ApiError, getSession, saveSession } from "./api"

export function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentSession = getSession()
  const addingWorkspace = searchParams.get("new") === "1"
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const suggestedSlug = useMemo(
    () =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    [name],
  )

  if (!currentSession) return <Navigate to="/login" replace />
  if (
    currentSession.activeWorkspace &&
    !["owner", "project_manager"].includes(
      currentSession.activeWorkspace.role,
    )
  ) {
    return <Navigate to="/" replace />
  }
  if (currentSession.activeWorkspace && !addingWorkspace) {
    return <Navigate to="/" replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const session = getSession()
    if (!session) {
      navigate("/login")
      return
    }

    setPending(true)
    setError("")
    try {
      const workspace = (
        await api.createWorkspace({
          name,
          slug: slug || suggestedSlug,
          description,
        })
      ).data
      saveSession({
        ...session,
        workspaces: [...session.workspaces, workspace],
        activeWorkspace: workspace,
      })
      navigate("/")
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to create workspace.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-brand">
        <span className="brand-mark">
          <span />
        </span>
      </div>
      <section className="onboarding-card">
        <div className="step-indicator">
          <span className="active" />
          <span />
          <span />
        </div>
        <span className="onboarding-icon">
          <Building2 size={23} />
        </span>
        <h1>Create your workspace</h1>
        <p>
          A workspace is the home for your organization’s teams and projects.
        </p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <label className="form-field">
            <span>Workspace name</span>
            <div>
              <Building2 size={16} />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Inc."
                required
              />
            </div>
          </label>
          <label className="form-field">
            <span>Workspace URL</span>
            <div className="slug-field">
              <em>northstar.app/</em>
              <input
                value={slug || suggestedSlug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="acme"
                required
              />
            </div>
          </label>
          <label className="form-field">
            <span>
              Description <em>Optional</em>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does your organization do?"
              rows={3}
            />
          </label>
          <button className="auth-submit" disabled={pending || !name}>
            {pending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              "Create workspace"
            )}
            {!pending && <ArrowRight size={16} />}
          </button>
        </form>
        <div className="onboarding-assurances">
          <span>
            <ShieldCheck size={15} />
            Private by default
          </span>
          <span>
            <Users size={15} />
            Invite your team next
          </span>
          <span>
            <Check size={15} />
            Change settings anytime
          </span>
        </div>
      </section>
    </main>
  )
}
