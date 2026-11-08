import { type FormEvent, useEffect, useRef, useState } from "react"

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react"

import { Navigate, useNavigate, useSearchParams } from "react-router"

import {
  api,
  ApiError,
  getSession,
  saveSession,
  type WorkspaceInvitationDetails,
  type WorkspaceRole,
} from "./api"

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",

  project_manager: "Project manager",

  team_leader: "Team leader",

  member: "Member",

  tester: "Tester",
}

type AuthMode = "signin" | "signup"

export function AuthPage({
  initialMode = "signin",
}: {
  initialMode?: AuthMode
}) {
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const inviteFromUrl = searchParams.get("invite") ?? ""

  const [mode, setMode] = useState<AuthMode>(initialMode)

  const [showPassword, setShowPassword] = useState(false)

  const [pending, setPending] = useState(false)

  const [checkingInvitation, setCheckingInvitation] = useState(false)

  const [error, setError] = useState("")

  const [fields, setFields] = useState<Record<string, string[]>>({})

  const [invitationToken, setInvitationToken] = useState(inviteFromUrl)

  const [invitation, setInvitation] =
    useState<WorkspaceInvitationDetails | null>(null)

  const [email, setEmail] = useState("")

  const invitationRequestId = useRef(0)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (initialMode !== "signup" || !inviteFromUrl) return

    const requestId = ++invitationRequestId.current

    setInvitationToken(inviteFromUrl)

    setCheckingInvitation(true)

    setError("")

    api

      .getInvitation(inviteFromUrl)

      .then(({ data }) => {
        if (requestId !== invitationRequestId.current) return

        setInvitation(data)

        setEmail(data.email)
      })

      .catch((caught: unknown) => {
        if (requestId !== invitationRequestId.current) return

        setInvitation(null)

        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to verify this invitation.",
        )
      })

      .finally(() => {
        if (requestId === invitationRequestId.current) {
          setCheckingInvitation(false)
        }
      })

    return () => {
      if (requestId === invitationRequestId.current) {
        invitationRequestId.current += 1
      }
    }
  }, [initialMode, inviteFromUrl])

  if (getSession()) return <Navigate to="/" replace />

  async function checkInvitation() {
    const requestId = ++invitationRequestId.current

    setCheckingInvitation(true)

    setError("")

    setInvitation(null)

    try {
      const result = await api.getInvitation(invitationToken.trim())

      if (requestId !== invitationRequestId.current) return

      setInvitation(result.data)

      setEmail(result.data.email)
    } catch (caught) {
      if (requestId !== invitationRequestId.current) return

      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to verify this invitation.",
      )
    } finally {
      if (requestId === invitationRequestId.current) {
        setCheckingInvitation(false)
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode === "signup" && !invitation) {
      setError(
        "Verify a valid workspace invitation before creating your account.",
      )

      return
    }

    setPending(true)

    setError("")

    setFields({})

    const form = new FormData(event.currentTarget)

    try {
      const result =
        mode === "signup"
          ? await api.register({
              name: String(form.get("name")),

              email: String(form.get("email")),

              password: String(form.get("password")),

              invitationToken: invitationToken.trim(),
            })
          : await api.login({
              email: String(form.get("email")),

              password: String(form.get("password")),
            })

      const session = result.data

      session.activeWorkspace = session.workspaces[0]

      saveSession(session)

      navigate(
        mode === "signup"
          ? "/"
          : session.workspaces.length
            ? "/"
            : "/onboarding",
      )
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)

        setFields(caught.fields ?? {})
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setPending(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)

    setError("")

    setFields({})

    if (nextMode === "signup") {
      navigate(
        invitationToken
          ? `/register?invite=${encodeURIComponent(invitationToken)}`
          : "/register",
      )
    } else {
      setInvitation(null)

      navigate("/login")
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="auth-brand">
          <span className="brand-mark">
            <span />
          </span>
        </div>
        <div className="auth-story">
          <span className="auth-kicker">
            <Sparkles size={14} /> One workspace. Clearer work.
          </span>
          <h1>Move every project forward with confidence.</h1>
          <p>
            Bring teams, priorities and progress into one focused workspace
            built for modern delivery.
          </p>
          <div className="auth-proof">
            <span>
              <Check size={14} /> Clear ownership
            </span>
            <span>
              <Check size={14} /> Real-time visibility
            </span>
            <span>
              <Check size={14} /> Roles set by invitation
            </span>
          </div>
        </div>
        <div className="auth-quote">
          <p>
            “This workspace gives everyone the context they need without adding
            more meetings.”
          </p>
          <span>Operations team · 48 members</span>
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <span className="brand-mark">
            <span />
          </span>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-heading">
            <span className="auth-heading-icon">
              {mode === "signup" ? (
                <UserRound size={20} />
              ) : (
                <LockKeyhole size={20} />
              )}
            </span>
            <h2>
              {mode === "signup"
                ? "Create your account"
                : "Sign in to your workspace"}
            </h2>
            <p>
              {mode === "signup"
                ? "Accept your invitation to join your team's workspace."
                : "Use the sign-in details for your workspace account."}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === "signup" && (
            <>
              <label className="form-field">
                <span>Invitation code</span>
                <div>
                  <KeyRound size={16} />
                  <input
                    name="invitationToken"
                    value={invitationToken}
                    onChange={(event) => {
                      invitationRequestId.current += 1
                      setCheckingInvitation(false)
                      setInvitationToken(event.target.value)

                      setInvitation(null)
                    }}
                    placeholder="Paste your invitation code"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={checkInvitation}
                    disabled={checkingInvitation || !invitationToken.trim()}
                  >
                    {checkingInvitation ? "Checking..." : "Verify"}
                  </button>
                </div>
                {fields.invitationToken && (
                  <small>{fields.invitationToken[0]}</small>
                )}
              </label>

              <label className="form-field">
                <span>Your workspace role</span>
                <div>
                  <UserRound size={16} />
                  <select value={invitation?.role ?? ""} disabled>
                    <option value="">
                      {checkingInvitation
                        ? "Verifying invitation..."
                        : "Verify your invitation to see your role"}
                    </option>
                    {invitation && (
                      <option value={invitation.role}>
                        {roleLabels[invitation.role]} ·{" "}
                        {invitation.workspace.name}
                      </option>
                    )}
                  </select>
                </div>
              </label>

              <label className="form-field">
                <span>Your name</span>
                <div>
                  <UserRound size={16} />
                  <input
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    required
                  />
                </div>
                {fields.name && <small>{fields.name[0]}</small>}
              </label>
            </>
          )}

          <label className="form-field">
            <span>Work email</span>
            <div>
              <Mail size={16} />
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            {fields.email && <small>{fields.email[0]}</small>}
          </label>

          <label className="form-field">
            <span>Password</span>
            <div>
              <LockKeyhole size={16} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 10 : undefined}
                placeholder={
                  mode === "signup"
                    ? "At least 10 characters"
                    : "Enter your password"
                }
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fields.password && <small>{fields.password[0]}</small>}
          </label>

          <button
            className="auth-submit"
            disabled={
              pending ||
              checkingInvitation ||
              (mode === "signup" && !invitation)
            }
          >
            {pending ? (
              <LoaderCircle className="spin" size={17} />
            ) : mode === "signup" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
            {!pending && <ArrowRight size={16} />}
          </button>

          <p className="auth-note">
            {mode === "signup"
              ? "Your role is assigned by your workspace invitation."
              : "Your workspace role is linked to your account membership."}
          </p>
          <p className="auth-switch">
            {mode === "signup"
              ? "Already have an account?"
              : "New to the workspace?"}{" "}
            <button
              type="button"
              onClick={() =>
                changeMode(mode === "signup" ? "signin" : "signup")
              }
            >
              {mode === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
        </form>
      </main>
    </div>
  )
}
