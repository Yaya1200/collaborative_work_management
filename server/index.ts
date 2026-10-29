import "reflect-metadata"
import "dotenv/config"
import bcrypt from "bcryptjs"
import cors from "cors"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import jwt from "jsonwebtoken"
import { AppDataSource } from "./data-source.js"
import {
  Project,
  Task,
  User,
  Workspace,
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

app.post("/api/v1/auth/register", async (request, response) => {
  const name = String(request.body.name ?? "").trim()
  const email = String(request.body.email ?? "")
    .trim()
    .toLowerCase()
  const password = String(request.body.password ?? "")
  const fields: Record<string, string[]> = {}

  if (name.length < 2) fields.name = ["Enter your full name."]
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = ["Enter a valid email address."]
  if (password.length < 10) fields.password = ["Use at least 10 characters."]
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

  const user = await users.save(
    users.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    }),
  )
  response.status(201).json({
    data: { token: issueToken(user), user: publicUser(user), workspaces: [] },
  })
})

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

app.post("/api/v1/workspaces", requireAuth, async (request, response) => {
  const name = String(request.body.name ?? "").trim()
  const slug = String(request.body.slug ?? "")
    .trim()
    .toLowerCase()
  const description = String(request.body.description ?? "").trim() || null
  const fields: Record<string, string[]> = {}
  if (name.length < 2) fields.name = ["Enter a workspace name."]
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    fields.slug = ["Use lowercase letters, numbers, and hyphens only."]
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
    const [data, total] = await AppDataSource.getRepository(
      Project,
    ).findAndCount({
      where: { workspace: { id: workspaceId } },
      relations: { space: true },
      order: { updatedAt: "DESC" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
    response.json({ data, meta: { page, per_page: perPage, total } })
  },
)

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
      .leftJoinAndSelect("task.owner", "owner")
      .where("task.workspace_id = :workspaceId", { workspaceId })

    if (request.query.status)
      query.andWhere("task.status = :status", { status: request.query.status })
    if (request.query.priority)
      query.andWhere("task.priority = :priority", {
        priority: request.query.priority,
      })
    if (request.query.search)
      query.andWhere("task.title LIKE :search", {
        search: `%${request.query.search}%`,
      })

    const [data, total] = await query
      .orderBy("task.due_date", "ASC")
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount()

    response.json({ data, meta: { page, per_page: perPage, total } })
  },
)

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
