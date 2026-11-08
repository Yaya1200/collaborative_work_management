import { type FormEvent, useEffect, useState } from "react"

import {
  CalendarDays,
  Copy,
  FolderKanban,
  LoaderCircle,
  MailPlus,
  Users,
} from "lucide-react"

import { Navigate } from "react-router"

import {
  api,
  ApiError,
  getSession,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceTask,
} from "./api"

import { SectionCard } from "./components"

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",

  project_manager: "Project manager",

  team_leader: "Team leader",

  member: "Developer",

  tester: "Tester",
}

const inviteRoles: WorkspaceRole[] = [
  "project_manager",

  "team_leader",

  "member",

  "tester",
]

export function TeamPage() {
  const session = getSession()

  const workspace = session?.activeWorkspace

  const isAdmin =
    workspace?.role === "project_manager" || workspace?.role === "owner"

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")
  const [invitationUrl, setInvitationUrl] = useState("")

  const [copied, setCopied] = useState(false)

  const [pending, setPending] = useState(false)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [fields, setFields] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!workspace?.id || !isAdmin) {
      setLoading(false)

      return
    }

    let active = true

    Promise.all([
      api.listWorkspaceMembers(workspace.id),
      api.listWorkspaceTasks(workspace.id),
    ])
      .then(([memberResult, taskResult]) => {
        if (!active) return

        setMembers(memberResult.data)

        setTasks(taskResult.data)
      })

      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load workspace team data.",
          )
        }
      })

      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [workspace?.id, isAdmin])

  if (!session) return <Navigate to="/login" replace />

  if (!isAdmin) return <Navigate to="/" replace />

  if (!workspace) return <Navigate to="/onboarding" replace />

  const workspaceId = workspace.id

  const availableInviteRoles =
    workspace.role === "owner"
      ? inviteRoles
      : inviteRoles.filter((inviteRole) => inviteRole !== "project_manager")

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPending(true)

    setError("")

    setFields({})

    setInvitationUrl("")

    setCopied(false)

    try {
      const result = await api.createWorkspaceInvitation(workspaceId, {
        email,

        role,
      })

      setInvitationUrl(
        new URL(result.data.invitationPath, window.location.origin).toString(),
      )

      setEmail("")
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)

        setFields(caught.fields ?? {})
      } else {
        setError("Unable to create the team invitation.")
      }
    } finally {
      setPending(false)
    }
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl)

      setCopied(true)
    } catch {
      setError(
        "Clipboard access is unavailable. Copy the invitation link shown below.",
      )
    }
  }

  const roles: WorkspaceRole[] = [
    "project_manager",

    "team_leader",

    "member",

    "tester",
  ]

  return (
    <div className="page team-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumbs">
            {workspace.name} <span>›</span> Team
          </p>
          <h1>Team</h1>
          <p>Invite teammates and view tasks assigned to each role.</p>
        </div>
        <span className="secondary-button">
          <Users size={16} /> {members.length} team members
        </span>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <SectionCard title="Add a team member" className="my-work">
        <form onSubmit={createInvitation}>
          <label className="form-field">
            <span>Work email</span>
            <div>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            {fields.email && <small>{fields.email[0]}</small>}
          </label>
          <label className="form-field">
            <span>Workspace role</span>
            <div>
              <select
                onChange={(event) =>
                  setRole(event.target.value as WorkspaceRole)
                }
                value={role}
              >
                {availableInviteRoles.map((inviteRole) => (
                  <option key={inviteRole} value={inviteRole}>
                    {roleLabels[inviteRole]}
                  </option>
                ))}
              </select>
            </div>
            {fields.role && <small>{fields.role[0]}</small>}
          </label>
          <p className="auth-note">
            The invitation link lets your teammate create an account with this
            workspace role.
          </p>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <MailPlus size={16} />
            )}
            Send invitation
          </button>
        </form>

        {invitationUrl && (
          <div className="invite-details">
            <h3>Invitation created</h3>
            <p>
              <strong>Share this link</strong>
              <span>{invitationUrl}</span>
            </p>
            <button
              className="secondary-button"
              onClick={() => void copyInvitation()}
              type="button"
            >
              <Copy size={15} /> {copied ? "Copied" : "Copy invitation link"}
            </button>
            <small>This invitation expires in seven days.</small>
          </div>
        )}
      </SectionCard>

      <div className="team-role-list">
        {roles.map((teamRole) => {
          const roleMembers = members.filter(
            (member) => member.role === teamRole,
          )

          return (
            <SectionCard
              key={teamRole}
              title={`${roleLabels[teamRole]}s (${roleMembers.length})`}
            >
              {loading ? (
                <p className="empty-copy">Loading team tasks…</p>
              ) : roleMembers.length ? (
                roleMembers.map((member) => {
                  const assignedTasks = tasks.filter(
                    (task) => task.owner.id === member.id,
                  )

                  const memberProjects = [
                    ...new Map(
                      assignedTasks.map((task) => [
                        task.project.id,

                        task.project.title,
                      ]),
                    ).values(),
                  ]

                  return (
                    <article
                      className="developer-directory-card"
                      key={member.id}
                    >
                      <div className="placeholder-row">
                        <span className="avatar bg-violet-100 text-violet-700">
                          {member.name

                            .split(/\s+/)

                            .map((part) => part[0] ?? "")

                            .join("")

                            .slice(0, 2)

                            .toUpperCase()}
                        </span>
                        <span>
                          <strong>{member.name}</strong>
                          <a href={`mailto:${member.email}`}>{member.email}</a>
                        </span>
                        <span className="developer-task-count">
                          {assignedTasks.length}{" "}
                          {assignedTasks.length === 1 ? "task" : "tasks"}
                        </span>
                      </div>
                      <div className="developer-directory-meta">
                        <span>
                          <FolderKanban size={14} />
                          {memberProjects.length
                            ? memberProjects.join(", ")
                            : "No assigned projects"}
                        </span>
                      </div>
                      {assignedTasks.length ? (
                        <ul className="developer-assigned-tasks">
                          {assignedTasks.map((task) => (
                            <li key={task.id}>
                              <span>
                                <strong>{task.title}</strong>
                                <small>
                                  {task.number} · {task.project.title}
                                  {task.project.space?.name
                                    ? ` · ${task.project.space.name}`
                                    : ""}
                                </small>
                              </span>
                              <span className="developer-task-details">
                                {task.startDate || task.dueDate ? (
                                  <span>
                                    <CalendarDays size={13} />
                                    {task.startDate
                                      ? task.startDate.slice(0, 10)
                                      : "No start"}
                                    {" – "}
                                    {task.dueDate
                                      ? task.dueDate.slice(0, 10)
                                      : "No end"}
                                  </span>
                                ) : (
                                  <span>No dates</span>
                                )}
                                <span>{task.priority} priority</span>
                                <span>{task.status.replace(/_/g, " ")}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empty-copy">No tasks assigned yet.</p>
                      )}
                    </article>
                  )
                })
              ) : (
                <p className="empty-copy">No {roleLabels[teamRole]}s yet.</p>
              )}
            </SectionCard>
          )
        })}
      </div>
    </div>
  )
}
