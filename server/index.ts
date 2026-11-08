import "reflect-metadata"
import "dotenv/config"
import bcrypt from "bcryptjs"
import cors from "cors"
import { createHash, randomBytes } from "node:crypto"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import jwt from "jsonwebtoken"
import { AppDataSource } from "./data-source.js"
import {
  Project,
  ProjectStatus,
  Space,
  Task,
  TaskStatus,
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "./entities.js"

const app = express()
const port = Number(process.env.API_PORT ?? 4000)
const jwtSecret = process.env.JWT_SECRET ?? ""

if (!jwtSecret) throw new Error("JWT_SECRET is required.")

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:8443",
    credentials: true,
  }),
)

app.use(express.json({ limit: "1mb" }))

app.use((request, response, next) => {
  response.locals.requestId =
    request.header("x-request-id") ?? crypto.randomUUID()
  response.setHeader("x-request-id", response.locals.requestId)
  next()
})

function apiError(
  response: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
) {
  response.status(status).json({
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
      request_id: response.locals.requestId,
    },
  })
}

function issueToken(user: User) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, {
    expiresIn: "7d",
    issuer: "workspace-pm",
  })
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function isValidInvitationToken(token: string) {
  return /^[A-Za-z0-9_-]{32,100}$/.test(token)
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    locale: user.locale,
  }
}

async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.header("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    apiError(response, 401, "UNAUTHENTICATED", "Authentication is required.")
    return
  }

  try {
    const payload = jwt.verify(authorization.slice(7), jwtSecret, {
      issuer: "workspace-pm",
    })

    if (typeof payload === "string" || !payload.sub) throw new Error()

    response.locals.userId = String(payload.sub)
    next()
  } catch {
    apiError(
      response,
      401,
      "INVALID_TOKEN",
      "Your session has expired. Please sign in again.",
    )
  }
}

app.get("/api/v1/health", (_request, response) => {
  response.json({
    data: {
      status: "ok",
      database: AppDataSource.isInitialized ? "connected" : "disconnected",
    },
  })
})

// Login
app.post("/api/v1/auth/login", async (request, response) => {
  const email = String(request.body.email ?? "")
    .trim()
    .toLowerCase()
  const password = String(request.body.password ?? "")

  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.email = :email", { email })
    .getOne()

  if (
    !user ||
    !user.isActive ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    apiError(
      response,
      401,
      "INVALID_CREDENTIALS",
      "The email or password is incorrect.",
    )
    return
  }

  const memberships = await AppDataSource.getRepository(WorkspaceMember).find({
    where: { user: { id: user.id }, status: "active" },
    relations: { workspace: true },
  })

  response.json({
    data: {
      token: issueToken(user),
      user: publicUser(user),
      workspaces: memberships.map((membership) => ({
        ...membership.workspace,
        role: membership.role,
      })),
    },
  })
})

app.get("/api/v1/auth/invitations/:token", async (request, response) => {
  const token = String(request.params.token)
  if (!isValidInvitationToken(token)) {
    apiError(response, 404, "INVITATION_NOT_FOUND", "This invitation is invalid or expired.")
    return
  }

  const invitation = await AppDataSource.getRepository(
    WorkspaceInvitation,
  ).findOne({
    where: { tokenHash: hashInvitationToken(token) },
    relations: { workspace: true },
  })

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt <= new Date()
  ) {
    apiError(response, 404, "INVITATION_NOT_FOUND", "This invitation is invalid or expired.")
    return
  }

  response.json({
    data: {
      email: invitation.email,
      role: invitation.role,
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
      },
    },
  })
})

app.post("/api/v1/auth/register", async (request, response) => {
  const name = String(request.body.name ?? "").trim()
  const email = String(request.body.email ?? "")
    .trim()
    .toLowerCase()
  const password = String(request.body.password ?? "")
  const invitationToken = String(request.body.invitationToken ?? "")
  const fields: Record<string, string[]> = {}

  if (name.length < 2 || name.length > 140) {
    fields.name = ["Enter a name between 2 and 140 characters."]
  }
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fields.email = ["Enter a valid email address."]
  }
  if (password.length < 10 || password.length > 72) {
    fields.password = ["Use a password between 10 and 72 characters."]
  }
  if (!isValidInvitationToken(invitationToken)) {
    fields.invitationToken = ["Enter a valid workspace invitation."]
  }

  if (Object.keys(fields).length) {
    apiError(
      response,
      422,
      "VALIDATION_FAILED",
      "The request contains invalid fields.",
      fields,
    )
    return
  }

  const registration = await AppDataSource.transaction(async (manager) => {
    const invitation = await manager.findOne(WorkspaceInvitation, {
      where: { tokenHash: hashInvitationToken(invitationToken) },
      relations: { workspace: true },
      lock: { mode: "pessimistic_write" },
    })

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    ) {
      return {
        error: {
          status: 404,
          code: "INVITATION_NOT_FOUND",
          message: "This invitation is invalid or expired.",
        },
      }
    }

    if (invitation.email !== email) {
      return {
        error: {
          status: 422,
          code: "INVITATION_EMAIL_MISMATCH",
          message: "Use the email address this invitation was sent to.",
          fields: { email: ["This email does not match the invitation."] },
        },
      }
    }

    if (await manager.getRepository(User).existsBy({ email })) {
      return {
        error: {
          status: 409,
          code: "ACCOUNT_EXISTS",
          message: "An account with this email already exists. Please sign in.",
          fields: { email: ["This email is already registered."] },
        },
      }
    }

    const user = await manager.save(
      User,
      manager.create(User, {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
      }),
    )
    await manager.save(
      WorkspaceMember,
      manager.create(WorkspaceMember, {
        workspace: invitation.workspace,
        user,
        role: invitation.role,
        status: "active",
      }),
    )

    invitation.acceptedAt = new Date()
    await manager.save(WorkspaceInvitation, invitation)

    return {
      user,
      workspace: invitation.workspace,
      role: invitation.role,
    }
  })

  if ("error" in registration && registration.error) {
    apiError(
      response,
      registration.error.status,
      registration.error.code,
      registration.error.message,
      "fields" in registration.error ? registration.error.fields : undefined,
    )
    return
  }

  response.status(201).json({
    data: {
      token: issueToken(registration.user),
      user: publicUser(registration.user),
      workspaces: [
        {
          ...registration.workspace,
          role: registration.role,
        },
      ],
    },
  })
})

// Current user
app.get("/api/v1/me", requireAuth, async (_request, response) => {
  const user = await AppDataSource.getRepository(User).findOneBy({
    id: response.locals.userId,
  })

  if (!user) {
    apiError(response, 404, "NOT_FOUND", "User was not found.")
    return
  }

  response.json({ data: publicUser(user) })
})

// List workspaces
app.get("/api/v1/workspaces", requireAuth, async (_request, response) => {
  const memberships = await AppDataSource.getRepository(WorkspaceMember).find({
    where: { user: { id: response.locals.userId }, status: "active" },
    relations: { workspace: true },
    order: { joinedAt: "DESC" },
  })

  response.json({
    data: memberships.map((membership) => ({
      ...membership.workspace,
      role: membership.role,
    })),
  })
})

// Create workspace
app.post("/api/v1/workspaces", requireAuth, async (request, response) => {
  const memberships = await AppDataSource.getRepository(WorkspaceMember).find({
    where: { user: { id: String(response.locals.userId) }, status: "active" },
  })
  if (
    memberships.length > 0 &&
    !memberships.some(
      (membership) =>
        membership.role === WorkspaceRole.Owner ||
        membership.role === WorkspaceRole.ProjectManager,
    )
  ) {
    apiError(
      response,
      403,
      "FORBIDDEN",
      "Developer accounts cannot create workspaces.",
    )
    return
  }

  const name = String(request.body.name ?? "").trim()
  const slug = String(request.body.slug ?? "")
    .trim()
    .toLowerCase()
  const description = String(request.body.description ?? "").trim() || null
  const fields: Record<string, string[]> = {}

  if (name.length < 2) fields.name = ["Enter a workspace name."]

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fields.slug = ["Use lowercase letters, numbers, and hyphens only."]
  }

  if (Object.keys(fields).length) {
    apiError(
      response,
      422,
      "VALIDATION_FAILED",
      "The request contains invalid fields.",
      fields,
    )
    return
  }

  if (await AppDataSource.getRepository(Workspace).existsBy({ slug })) {
    apiError(
      response,
      409,
      "SLUG_UNAVAILABLE",
      "This workspace URL is already in use.",
      { slug: ["Choose another workspace URL."] },
    )
    return
  }

  const workspace = await AppDataSource.transaction(async (manager) => {
    const user = await manager.findOneByOrFail(User, {
      id: response.locals.userId,
    })

    const created = await manager.save(
      Workspace,
      manager.create(Workspace, { name, slug, description, owner: user }),
    )

    await manager.save(
      WorkspaceMember,
      manager.create(WorkspaceMember, {
        workspace: created,
        user,
        role: WorkspaceRole.Owner,
        status: "active",
      }),
    )

    return created
  })

  response.status(201).json({
    data: { ...workspace, role: WorkspaceRole.Owner },
  })
})

// Verify workspace membership
async function requireWorkspaceMember(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const userId = response.locals.userId as string | undefined
  const workspaceId = String(request.params.workspaceId)

  if (!userId) {
    apiError(response, 401, "UNAUTHENTICATED", "Authentication is required.")
    return
  }

  const membership = await AppDataSource.getRepository(WorkspaceMember).findOne(
    {
      where: {
        workspace: { id: workspaceId },
        user: { id: userId },
        status: "active",
      },
      relations: { workspace: true, user: true },
    },
  )

  if (!membership) {
    apiError(response, 404, "NOT_FOUND", "Workspace was not found.")
    return
  }

  response.locals.membership = membership
  next()
}

function requireWorkspaceAdmin(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  const membership = response.locals.membership as WorkspaceMember | undefined
  if (
    !membership ||
    ![WorkspaceRole.Owner, WorkspaceRole.ProjectManager].includes(
      membership.role,
    )
  ) {
    apiError(
      response,
      403,
      "FORBIDDEN",
      "Administrator access is required for this workspace.",
    )
    return
  }
  next()
}

function requireWorkspaceProjectManager(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  const membership = response.locals.membership as WorkspaceMember | undefined
  if (!membership || membership.role !== WorkspaceRole.ProjectManager) {
    apiError(
      response,
      403,
      "FORBIDDEN",
      "Project manager access is required to create tasks.",
    )
    return
  }
  next()
}

app.get(
  "/api/v1/workspaces/:workspaceId/members",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const members = await AppDataSource.getRepository(WorkspaceMember).find({
      where: {
        workspace: { id: String(request.params.workspaceId) },
        status: "active",
      },
      relations: { user: true },
      order: { joinedAt: "ASC" },
    })

    response.json({
      data: members.map(({ user, role }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      })),
    })
  },
)

app.post(
  "/api/v1/workspaces/:workspaceId/invitations",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase()
    const role = String(request.body.role ?? "")
    const fields: Record<string, string[]> = {}
    const allowedRoles = [
      WorkspaceRole.Owner,
      WorkspaceRole.ProjectManager,
      WorkspaceRole.TeamLeader,
      WorkspaceRole.Member,
      WorkspaceRole.Tester,
    ]

    if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = ["Enter a valid email address."]
    }
    if (!allowedRoles.includes(role as WorkspaceRole)) {
      fields.role = ["Choose a valid workspace role."]
    }

    const membership = response.locals.membership as WorkspaceMember
    if (
      [WorkspaceRole.Owner, WorkspaceRole.ProjectManager].includes(
        role as WorkspaceRole,
      ) &&
      membership.role !== WorkspaceRole.Owner
    ) {
      apiError(
        response,
        403,
        "FORBIDDEN",
        "Only workspace owners can invite owners or project managers.",
      )
      return
    }

    if (Object.keys(fields).length) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "The request contains invalid fields.",
        fields,
      )
      return
    }

    const users = AppDataSource.getRepository(User)
    if (await users.existsBy({ email })) {
      apiError(
        response,
        409,
        "ACCOUNT_EXISTS",
        "This email already has an account and cannot use a new-user invitation.",
        { email: ["This email is already registered."] },
      )
      return
    }

    const workspaceId = String(request.params.workspaceId)
    const invitations = AppDataSource.getRepository(WorkspaceInvitation)
    const activeInvitation = await invitations
      .createQueryBuilder("invitation")
      .where("invitation.workspace_id = :workspaceId", { workspaceId })
      .andWhere("invitation.email = :email", { email })
      .andWhere("invitation.accepted_at IS NULL")
      .andWhere("invitation.expires_at > :now", { now: new Date() })
      .getOne()

    if (activeInvitation) {
      apiError(
        response,
        409,
        "INVITATION_EXISTS",
        "An active invitation already exists for this email.",
        { email: ["An active invitation already exists."] },
      )
      return
    }

    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const workspace = await AppDataSource.getRepository(Workspace).findOneByOrFail({
      id: workspaceId,
    })
    const invitation = await invitations.save(
      invitations.create({
        workspace,
        inviter: membership.user,
        email,
        role: role as WorkspaceRole,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      }),
    )

    response.status(201).json({
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        invitationPath: `/register?invite=${encodeURIComponent(token)}`,
      },
    })
  },
)

// List developers in a workspace
app.get(
  "/api/v1/workspaces/:workspaceId/developers",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const developers = await AppDataSource.getRepository(WorkspaceMember).find({
      where: {
        workspace: { id: String(request.params.workspaceId) },
        role: WorkspaceRole.Member,
        status: "active",
      },
      relations: { user: true },
      order: { joinedAt: "ASC" },
    })

    response.json({
      data: developers.map(({ user }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    })
  },
)

// Create a developer account and return its generated password once.
app.post(
  "/api/v1/workspaces/:workspaceId/developers",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const name = String(request.body.name ?? "").trim()
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase()
    const fields: Record<string, string[]> = {}

    if (name.length < 2 || name.length > 140) {
      fields.name = ["Enter a name between 2 and 140 characters."]
    }
    if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = ["Enter a valid email address."]
    }

    if (Object.keys(fields).length) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "The request contains invalid fields.",
        fields,
      )
      return
    }

    const users = AppDataSource.getRepository(User)
    if (await users.existsBy({ email })) {
      apiError(
        response,
        409,
        "ACCOUNT_EXISTS",
        "An account with this email already exists.",
      )
      return
    }

    const workspaceId = String(request.params.workspaceId)
    const generatedPassword = randomBytes(18).toString("base64url")
    const developer = await AppDataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          name,
          email,
          passwordHash: await bcrypt.hash(generatedPassword, 12),
        }),
      )
      const workspace = await manager.findOneByOrFail(Workspace, {
        id: workspaceId,
      })
      await manager.save(
        WorkspaceMember,
        manager.create(WorkspaceMember, {
          workspace,
          user,
          role: WorkspaceRole.Member,
          status: "active",
        }),
      )
      return user
    })

    response.status(201).json({
      data: {
        developer: {
          id: developer.id,
          name: developer.name,
          email: developer.email,
        },
        generatedPassword,
        loginPath: "/login",
      },
    })
  },
)

// List projects
app.get(
  "/api/v1/workspaces/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const page = Math.max(Number(request.query.page ?? 1), 1)
    const perPage = Math.min(
      Math.max(Number(request.query.per_page ?? 25), 1),
      100,
    )

    const membership = response.locals.membership as WorkspaceMember
    const query = AppDataSource.getRepository(Project)
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.space", "space")
      .where("project.workspace_id = :workspaceId", { workspaceId })

    if (membership.role === WorkspaceRole.Member) {
      query
        .innerJoin(Task, "assignedTask", "assignedTask.project_id = project.id")
        .andWhere("assignedTask.owner_user_id = :userId", {
          userId: membership.user.id,
        })
    }

    const [data, total] = await query
      .distinct(true)
      .orderBy("project.updated_at", "DESC")
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount()

    response.json({ data, meta: { page, per_page: perPage, total } })
  },
)

// Create a project and its space as needed.
app.post(
  "/api/v1/workspaces/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const name = String(request.body.name ?? "").trim()
    const spaceName = String(request.body.space ?? "").trim()
    const description = String(request.body.description ?? "").trim() || null
    const startDate = String(request.body.startDate ?? "").trim() || null
    const targetDate = String(request.body.targetDate ?? "").trim() || null
    const fields: Record<string, string[]> = {}

    if (name.length < 2 || name.length > 180) {
      fields.name = ["Enter a project name between 2 and 180 characters."]
    }
    if (spaceName.length < 2 || spaceName.length > 140) {
      fields.space = ["Enter a space name between 2 and 140 characters."]
    }
    for (const [field, value] of [
      ["startDate", startDate],
      ["targetDate", targetDate],
    ] as const) {
      if (!value) continue
      const parsedDate = new Date(`${value}T00:00:00.000Z`)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== value
      ) {
        fields[field] = [
          `Enter a valid ${field === "startDate" ? "start" : "end"} date.`,
        ]
      }
    }
    if (startDate && targetDate && targetDate < startDate) {
      fields.targetDate = ["The end date must be on or after the start date."]
    }
    if (Object.keys(fields).length) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "The request contains invalid fields.",
        fields,
      )
      return
    }

    const project = await AppDataSource.transaction(async (manager) => {
      const workspace = await manager.findOneByOrFail(Workspace, {
        id: workspaceId,
      })
      const spaces = manager.getRepository(Space)
      let space = await spaces.findOne({
        where: { workspace: { id: workspaceId }, name: spaceName },
      })
      if (!space) {
        space = await spaces.save(spaces.create({ workspace, name: spaceName }))
      }

      const keys = await manager.getRepository(Project).find({
        where: { workspace: { id: workspaceId } },
        select: { key: true },
      })
      const prefix =
        name
          .split(/\s+/)
          .map((part) => part[0] ?? "")
          .join("")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 3) || "PRJ"
      const usedKeys = new Set(keys.map((item) => item.key))
      let key = prefix
      let suffix = 2
      while (usedKeys.has(key)) {
        key = `${prefix}${suffix}`
        suffix += 1
      }

      return manager.save(
        Project,
        manager.create(Project, {
          workspace,
          space,
          key,
          title: name,
          description,
          status: ProjectStatus.Planning,
          startDate,
          targetDate,
        }),
      )
    })
    const data = await AppDataSource.getRepository(Project).findOneOrFail({
      where: { id: project.id },
      relations: { space: true },
    })
    response.status(201).json({ data })
  },
)

app.patch(
  "/api/v1/workspaces/:workspaceId/projects/:projectId/status",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const projectId = String(request.params.projectId)
    const status = request.body.status as ProjectStatus
    if (!Object.values(ProjectStatus).includes(status)) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "Choose a valid project status.",
        { status: ["Choose a valid project status."] },
      )
      return
    }

    const repository = AppDataSource.getRepository(Project)
    const project = await repository.findOne({
      where: { id: projectId, workspace: { id: workspaceId } },
      relations: { space: true },
    })
    if (!project) {
      apiError(response, 404, "NOT_FOUND", "Project was not found.")
      return
    }

    project.status = status
    response.json({ data: await repository.save(project) })
  },
)

app.delete(
  "/api/v1/workspaces/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const projectId = String(request.params.projectId)
    const repository = AppDataSource.getRepository(Project)
    const project = await repository.findOne({
      where: { id: projectId, workspace: { id: workspaceId } },
    })
    if (!project) {
      apiError(response, 404, "NOT_FOUND", "Project was not found.")
      return
    }

    await repository.remove(project)
    response.json({ data: { id: projectId } })
  },
)

// List spaces related to projects with assigned developer tasks.
app.get(
  "/api/v1/workspaces/:workspaceId/spaces",
  requireAuth,
  requireWorkspaceMember,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const membership = response.locals.membership as WorkspaceMember
    const query = AppDataSource.getRepository(Space)
      .createQueryBuilder("space")
      .where("space.workspace_id = :workspaceId", { workspaceId })

    if (membership.role === WorkspaceRole.Member) {
      query
        .innerJoin(Project, "project", "project.space_id = space.id")
        .innerJoin(Task, "task", "task.project_id = project.id")
        .andWhere("task.owner_user_id = :userId", {
          userId: membership.user.id,
        })
    }

    const data = await query
      .distinct(true)
      .orderBy("space.name", "ASC")
      .getMany()
    response.json({ data })
  },
)

// List tasks
app.get(
  "/api/v1/workspaces/:workspaceId/tasks",
  requireAuth,
  requireWorkspaceMember,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const page = Math.max(Number(request.query.page ?? 1), 1)
    const perPage = Math.min(
      Math.max(Number(request.query.per_page ?? 25), 1),
      100,
    )

    const query = AppDataSource.getRepository(Task)
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.project", "project")
      .leftJoinAndSelect("project.space", "space")
      .leftJoinAndSelect("task.owner", "owner")
      .where("task.workspace_id = :workspaceId", { workspaceId })

    const membership = response.locals.membership as WorkspaceMember
    if (membership.role === WorkspaceRole.Member) {
      query.andWhere("task.owner_user_id = :userId", {
        userId: membership.user.id,
      })
    }

    if (request.query.status) {
      query.andWhere("task.status = :status", { status: request.query.status })
    }

    if (request.query.priority) {
      query.andWhere("task.priority = :priority", {
        priority: request.query.priority,
      })
    }

    if (request.query.search) {
      query.andWhere("task.title LIKE :search", {
        search: `%${request.query.search}%`,
      })
    }

    const [data, total] = await query
      .orderBy("task.due_date", "ASC")
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount()

    response.json({ data, meta: { page, per_page: perPage, total } })
  },
)

// Create a task assigned to a developer.
app.post(
  "/api/v1/workspaces/:workspaceId/tasks",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceProjectManager,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const title = String(request.body.title ?? "").trim()
    const projectId = String(request.body.projectId ?? "")
    const developerId = String(request.body.developerId ?? "")
    const priority = String(request.body.priority ?? "medium")
    const description = String(request.body.description ?? "").trim() || null
    const status = String(request.body.status ?? TaskStatus.Todo)
    const startDate = String(request.body.startDate ?? "").trim() || null
    const dueDate = String(request.body.dueDate ?? "").trim() || null
    const fields: Record<string, string[]> = {}

    if (title.length < 2 || title.length > 240) {
      fields.title = ["Enter a task title between 2 and 240 characters."]
    }
    if (description && description.length > 5000) {
      fields.description = ["Task descriptions cannot exceed 5000 characters."]
    }
    if (!["low", "medium", "high", "critical"].includes(priority)) {
      fields.priority = ["Choose a valid priority."]
    }
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      fields.status = ["Choose a valid task status."]
    }
    for (const [field, value] of [
      ["startDate", startDate],
      ["dueDate", dueDate],
    ] as const) {
      if (!value) continue
      const parsedDate = new Date(`${value}T00:00:00.000Z`)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== value
      ) {
        fields[field] = [
          `Enter a valid ${field === "startDate" ? "start" : "end"} date.`,
        ]
      }
    }
    if (startDate && dueDate && dueDate < startDate) {
      fields.dueDate = ["The end date must be on or after the start date."]
    }
    if (Object.keys(fields).length) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "The request contains invalid fields.",
        fields,
      )
      return
    }

    const [project, developerMembership] = await Promise.all([
      AppDataSource.getRepository(Project).findOne({
        where: { id: projectId, workspace: { id: workspaceId } },
      }),
      AppDataSource.getRepository(WorkspaceMember).findOne({
        where: {
          workspace: { id: workspaceId },
          user: { id: developerId },
          role: WorkspaceRole.Member,
          status: "active",
        },
        relations: { user: true },
      }),
    ])
    if (!project) {
      apiError(
        response,
        422,
        "INVALID_PROJECT",
        "Choose a project in this workspace.",
        { projectId: ["Choose a project in this workspace."] },
      )
      return
    }
    if (!developerMembership) {
      apiError(
        response,
        422,
        "INVALID_DEVELOPER",
        "Choose an active developer in this workspace.",
        { developerId: ["Choose an active developer in this workspace."] },
      )
      return
    }

    const workspace = await AppDataSource.getRepository(
      Workspace,
    ).findOneByOrFail({
      id: workspaceId,
    })
    const task = await AppDataSource.getRepository(Task).save(
      AppDataSource.getRepository(Task).create({
        workspace,
        project,
        number: `${project.key}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`,
        title,
        description,
        status: status as TaskStatus,
        priority: priority as Task["priority"],
        owner: developerMembership.user,
        startDate,
        dueDate,
        progressPct: status === TaskStatus.Done ? 100 : 0,
      }),
    )
    const data = await AppDataSource.getRepository(Task).findOneOrFail({
      where: { id: task.id },
      relations: { project: { space: true }, owner: true },
    })
    response.status(201).json({ data })
  },
)

// Developers may update only their own task status; administrators may update
// any task in the workspace.
app.patch(
  "/api/v1/workspaces/:workspaceId/tasks/:taskId/assignee",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const developerId = String(request.body.developerId ?? "")
    const membership = await AppDataSource.getRepository(
      WorkspaceMember,
    ).findOne({
      where: {
        workspace: { id: workspaceId },
        user: { id: developerId },
        role: WorkspaceRole.Member,
        status: "active",
      },
      relations: { user: true },
    })

    if (!membership) {
      apiError(
        response,
        422,
        "INVALID_DEVELOPER",
        "Choose an active developer in this workspace.",
        { developerId: ["Choose an active developer in this workspace."] },
      )
      return
    }

    const task = await AppDataSource.getRepository(Task).findOne({
      where: {
        id: String(request.params.taskId),
        workspace: { id: workspaceId },
      },
    })
    if (!task) {
      apiError(response, 404, "NOT_FOUND", "Task was not found.")
      return
    }

    task.owner = membership.user
    await AppDataSource.getRepository(Task).save(task)
    response.json({ data: task })
  },
)

app.patch(
  "/api/v1/workspaces/:workspaceId/tasks/:taskId/status",
  requireAuth,
  requireWorkspaceMember,
  async (request, response) => {
    const membership = response.locals.membership as WorkspaceMember
    const status = request.body.status as TaskStatus
    if (!Object.values(TaskStatus).includes(status)) {
      apiError(
        response,
        422,
        "VALIDATION_FAILED",
        "Choose a valid task status.",
        { status: ["Choose a valid task status."] },
      )
      return
    }

    const task = await AppDataSource.getRepository(Task).findOne({
      where: {
        id: String(request.params.taskId),
        workspace: { id: String(request.params.workspaceId) },
        ...(membership.role === WorkspaceRole.Member
          ? { owner: { id: membership.user.id } }
          : {}),
      },
    })

    if (!task) {
      apiError(response, 404, "NOT_FOUND", "Task was not found.")
      return
    }
    if (
      ![
        WorkspaceRole.Owner,
        WorkspaceRole.ProjectManager,
        WorkspaceRole.Member,
      ].includes(membership.role)
    ) {
      apiError(response, 403, "FORBIDDEN", "You cannot update this task.")
      return
    }

    task.status = status
    task.isBlocked = status === TaskStatus.Blocked
    if (status === TaskStatus.Done) task.progressPct = 100
    const repository = AppDataSource.getRepository(Task)
    await repository.save(task)
    const updated = await repository.findOneOrFail({
      where: { id: task.id },
      relations: { project: { space: true }, owner: true },
    })
    response.json({ data: updated })
  },
)

// Dashboard
app.get(
  "/api/v1/workspaces/:workspaceId/dashboard",
  requireAuth,
  requireWorkspaceMember,
  async (request, response) => {
    const workspaceId = String(request.params.workspaceId)
    const userId = response.locals.userId as string
    const membership = response.locals.membership as WorkspaceMember
    const developerView = membership.role === WorkspaceRole.Member
    const today = new Date().toISOString().slice(0, 10)

    const taskRepository = AppDataSource.getRepository(Task)
    const projectRepository = AppDataSource.getRepository(Project)
    const scopedTasks = taskRepository
      .createQueryBuilder("task")
      .where("task.workspace_id = :workspaceId", { workspaceId })
    const scopedProjects = projectRepository
      .createQueryBuilder("project")
      .where("project.workspace_id = :workspaceId", { workspaceId })
    if (developerView) {
      scopedTasks.andWhere("task.owner_user_id = :userId", { userId })
      scopedProjects
        .innerJoin(Task, "assignedTask", "assignedTask.project_id = project.id")
        .andWhere("assignedTask.owner_user_id = :userId", { userId })
    }

    const myTasks = taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.project", "project")
      .leftJoinAndSelect("task.owner", "owner")
      .where("task.workspace_id = :workspaceId", { workspaceId })
      .andWhere("task.owner_user_id = :userId", { userId })

    const [
      myOpenTasks,
      overdueTasks,
      blockedTasks,
      awaitingReview,
      activeProjects,
      totalProjects,
      upcomingDeadlines,
      projects,
      myTaskList,
    ] = await Promise.all([
      myTasks
        .clone()
        .andWhere("task.status != :done", { done: "done" })
        .getCount(),

      myTasks
        .clone()
        .andWhere("task.status != :done", { done: "done" })
        .andWhere("task.due_date < :today", { today })
        .getCount(),

      scopedTasks
        .clone()
        .andWhere("(task.is_blocked = :blocked OR task.status = :status)", {
          blocked: true,
          status: TaskStatus.Blocked,
        })
        .getCount(),

      scopedTasks
        .clone()
        .andWhere("task.status = :status", { status: TaskStatus.InReview })
        .getCount(),

      scopedProjects
        .clone()
        .andWhere("project.status = :status", {
          status: ProjectStatus.Active,
        })
        .getCount(),

      scopedProjects.clone().getCount(),

      scopedTasks
        .clone()
        .leftJoinAndSelect("task.project", "project")
        .leftJoinAndSelect("task.owner", "owner")
        .andWhere("task.due_date >= :today", { today })
        .andWhere("task.status != :done", { done: "done" })
        .orderBy("task.due_date", "ASC")
        .take(5)
        .getMany(),

      scopedProjects
        .clone()
        .leftJoinAndSelect("project.space", "space")
        .distinct(true)
        .orderBy("project.updated_at", "DESC")
        .take(5)
        .getMany(),

      myTasks
        .clone()
        .andWhere("task.status != :done", { done: "done" })
        .orderBy("task.due_date", "ASC")
        .take(5)
        .getMany(),
    ])

    response.json({
      data: {
        stats: {
          myOpenTasks,
          overdueTasks,
          blockedTasks,
          awaitingReview,
          activeProjects,
          totalProjects,
        },
        myTasks: myTaskList,
        upcomingDeadlines,
        projects,
      },
    })
  },
)

// Central error handler
app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error(error)
    apiError(response, 500, "INTERNAL_ERROR", "An unexpected error occurred.")
  },
)

AppDataSource.initialize()
  .then(() =>
    app.listen(port, () =>
      console.log(`Workspace PM API listening on port ${port}`),
    ),
  )
  .catch((error: unknown) => {
    console.error("Unable to initialize MySQL connection.", error)
    process.exitCode = 1
  })
