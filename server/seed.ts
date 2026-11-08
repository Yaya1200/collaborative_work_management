import "reflect-metadata"

import "dotenv/config"

import bcrypt from "bcryptjs"

import { AppDataSource } from "./data-source.js"

import { User, Workspace, WorkspaceMember, WorkspaceRole } from "./entities.js"

const adminName = (process.env.ADMIN_NAME ?? "").trim()
const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
const adminPassword = process.env.ADMIN_PASSWORD ?? ""
const workspaceName = (
  process.env.ADMIN_WORKSPACE_NAME ?? "Northstar Workspace"
).trim()
const workspaceSlug = (process.env.ADMIN_WORKSPACE_SLUG ?? "northstar")
  .toLowerCase()
  .trim()

if (adminName.length < 2 || adminName.length > 140) {
  throw new Error("ADMIN_NAME must be between 2 and 140 characters.")
}

if (adminEmail.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error("ADMIN_EMAIL must be a valid email address.")
}

if (adminPassword.length < 10) {
  throw new Error("ADMIN_PASSWORD must be at least 10 characters.")
}

if (!workspaceName || workspaceName.length > 140) {
  throw new Error("ADMIN_WORKSPACE_NAME must be between 1 and 140 characters.")
}

if (
  workspaceSlug.length > 100 ||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug)
) {
  throw new Error(
    "ADMIN_WORKSPACE_SLUG must contain lowercase letters, numbers, and hyphens.",
  )
}

try {
  await AppDataSource.initialize()

  const seededWorkspaceName = await AppDataSource.transaction(
    async (manager) => {
      const users = manager.getRepository(User)

      let admin = await users.findOneBy({ email: adminEmail })

      const passwordHash = await bcrypt.hash(adminPassword, 12)

      if (!admin) {
        admin = users.create({ email: adminEmail })
      }

      admin.name = adminName

      admin.passwordHash = passwordHash

      admin.isActive = true

      admin = await users.save(admin)

      const workspaces = manager.getRepository(Workspace)

      let workspace = await workspaces.findOne({
        where: { slug: workspaceSlug },

        relations: { owner: true },
      })

      if (!workspace) {
        workspace = await workspaces.save(
          workspaces.create({
            name: workspaceName,

            slug: workspaceSlug,

            description: "Administrator workspace",

            owner: admin,
          }),
        )
      } else if (workspace.owner.id !== admin.id) {
        throw new Error(
          `Workspace slug "${workspaceSlug}" is already owned by another user.`,
        )
      }

      const members = manager.getRepository(WorkspaceMember)

      let membership = await members.findOne({
        where: { workspace: { id: workspace.id }, user: { id: admin.id } },
      })

      if (!membership) {
        membership = members.create({ workspace, user: admin })
      }

      membership.role = WorkspaceRole.Owner

      membership.status = "active"

      await members.save(membership)

      return workspace.name
    },
  )

  console.log(
    `Seeded administrator ${adminEmail} for workspace "${seededWorkspaceName}".`,
  )
} catch (error) {
  console.error("Administrator seed failed.", error)

  process.exitCode = 1
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
}
