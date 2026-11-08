import { type FormEvent, useEffect, useState } from "react"

import {
  CalendarDays,
  Copy,
  FolderKanban,
  LoaderCircle,
  MailPlus,
  Users,
} from "lucide-react"

import emailjs from "@emailjs/browser"

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

async function deliverInvitationEmail(
  recipient: string,
  invitationUrl: string,
  workspaceName: string,
  role: WorkspaceRole,
  inviterName: string,
) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      "EmailJS is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.",
    )
  }

  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: recipient,
      invitation_url: invitationUrl,
      workspace_name: workspaceName,
      workspace_role: roleLabels[role],
      inviter_name: inviterName,
      expires_in: "7 days",
    },
    { publicKey },
  )
}

export function TeamPage() {
  const session = getSession()

  const workspace = session?.activeWorkspace
  const workspaceActive = workspace?.isActive !== false

  const isAdmin =
    workspace?.role === "project_manager" || workspace?.role === "owner"
  const canInviteMembers = workspace?.role === "owner"

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")
  const [invitationUrl, setInvitationUrl] = useState("")
  const [invitedEmail, setInvitedEmail] = useState("")
  const [invitedRole, setInvitedRole] = useState<WorkspaceRole>("member")
  const [invitationEmailSent, setInvitationEmailSent] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

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
  const workspaceName = workspace.name
  const inviterName = session.user.name

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPending(true)

    setError("")

    setFields({})

    setInvitationUrl("")

    setCopied(false)
    setInvitationEmailSent(false)

    if (
      !import.meta.env.VITE_EMAILJS_SERVICE_ID ||
      !import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
      !import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    ) {
      setError(
        "EmailJS is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY before creating invitations.",
      )
      setPending(false)
      return
    }

    try {
      const result = await api.createWorkspaceInvitation(workspaceId, {
        email,

        role,
      })

      const link = new URL(
        result.data.invitationPath,
        window.location.origin,
      ).toString()
      setInvitationUrl(link)
      setInvitedEmail(result.data.email)
      setInvitedRole(result.data.role)

      setEmail("")
      try {
        await deliverInvitationEmail(
          result.data.email,
          link,
          workspaceName,
          result.data.role,
          inviterName,
        )
        setInvitationEmailSent(true)
      } catch (caught) {
        setError(
          `Invitation created, but the email could not be sent: ${
            caught instanceof Error
              ? caught.message
              : "EmailJS returned an unexpected error."
          }`,
        )
      }
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

  async function resendInvitationEmail() {
    if (!invitationUrl) return

    setResendingEmail(true)
    setError("")
    try {
      await deliverInvitationEmail(
        invitedEmail,
        invitationUrl,
        workspaceName,
        invitedRole,
        inviterName,
      )
      setInvitationEmailSent(true)
    } catch (caught) {
      setInvitationEmailSent(false)
      setError(
        `The invitation email could not be sent: ${
          caught instanceof Error
            ? caught.message
            : "EmailJS returned an unexpected error."
        }`,
      )
    } finally {
      setResendingEmail(false)
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

      {canInviteMembers && (
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
                  {inviteRoles.map((inviteRole) => (
                    <option key={inviteRole} value={inviteRole}>
                      {roleLabels[inviteRole]}
                    </option>
                  ))}
                </select>
              </div>
              {fields.role && <small>{fields.role[0]}</small>}
            </label>
            <p className="auth-note">
              Invite project managers, team leaders, developers, and testers.
              The invitation link will be emailed to the address above.
            </p>
            <button
              className="primary-button"
              disabled={pending || !workspaceActive}
              type="submit"
            >
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
              <h3>
                {invitationEmailSent
                  ? "Invitation email sent"
                  : "Invitation created"}
              </h3>
              <p>
                {invitationEmailSent
                  ? `Sent to ${invitedEmail}.`
                  : `Email delivery to ${invitedEmail} failed; retry or share the link below.`}
              </p>
              {!invitationEmailSent && (
                <button
                  className="secondary-button"
                  disabled={resendingEmail}
                  onClick={() => void resendInvitationEmail()}
                  type="button"
                >
                  {resendingEmail ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <MailPlus size={15} />
                  )}
                  Retry email
                </button>
              )}
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
      )}

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
