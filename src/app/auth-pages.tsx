import { type FormEvent, useState } from "react"
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  User,
} from "lucide-react"
import { Link, Navigate, useNavigate } from "react-router"
import {
  api,
  ApiError,
  createDemoSession,
  getSession,
  saveSession,
} from "./api"

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [fields, setFields] = useState<Record<string, string[]>>({})

  if (getSession()) return <Navigate to="/" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    setFields({})
    const form = new FormData(event.currentTarget)
    try {
      const result =
        mode === "register"
          ? await api.register({
              name: String(form.get("name")),
              email: String(form.get("email")),
              password: String(form.get("password")),
            })
          : await api.login({
              email: String(form.get("email")),
              password: String(form.get("password")),
            })
      const session = result.data
      session.activeWorkspace = session.workspaces[0]
      saveSession(session)
      navigate(session.workspaces.length ? "/" : "/onboarding")
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

  function exploreDemo() {
    saveSession(createDemoSession())
    navigate("/")
  }

  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="auth-brand">
          <span className="brand-mark">
            <span />
          </span>
          Northstar
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
              <Check size={14} /> Scoped permissions
            </span>
          </div>
        </div>
        <div className="auth-quote">
          <p>
            “Northstar gives everyone the context they need without adding more
            meetings.”
          </p>
          <span>Operations team · 48 members</span>
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <span className="brand-mark">
            <span />
          </span>
          Northstar
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-heading">
            <span className="auth-heading-icon">
              {mode === "login" ? (
                <LockKeyhole size={20} />
              ) : (
                <Layers3 size={20} />
              )}
            </span>
            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to continue to your workspace."
                : "Start organizing your team’s work in minutes."}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === "register" && (
            <label className="form-field">
              <span>Full name</span>
              <div>
                <User size={16} />
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
              {fields.name && <small>{fields.name[0]}</small>}
            </label>
          )}
          <label className="form-field">
            <span>Work email</span>
            <div>
              <Mail size={16} />
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
            </div>
            {fields.email && <small>{fields.email[0]}</small>}
          </label>
          <label className="form-field">
            <span>
              Password
              {mode === "login" && (
                <button type="button">Forgot password?</button>
              )}
            </span>
            <div>
              <LockKeyhole size={16} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  mode === "register"
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

          <button className="auth-submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="spin" size={17} />
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
            {!pending && <ArrowRight size={16} />}
          </button>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <button className="demo-button" type="button" onClick={exploreDemo}>
            Explore the demo workspace
          </button>
          <p className="auth-switch">
            {mode === "login"
              ? "New to Northstar?"
              : "Already have an account?"}{" "}
            <Link to={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
