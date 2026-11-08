
import "reflect-metadata";
import { DataSource } from "typeorm";

import {
  Project,
  Space,
  Task,
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from "./entities.js";

import { InitialWorkspaceSchema1729958400000 } from "./migrations/1729958400000-InitialWorkspaceSchema.js";
import { AddDeveloperRole1730707200000 } from "./migrations/1730707200000-AddDeveloperRole.js";
import { AddRoleBasedInvitations1730793600000 } from "./migrations/1730793600000-AddRoleBasedInvitations.js";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? "workspace_pm",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "workspace_pm",
  entities: [
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceInvitation,
    Space,
    Project,
    Task,
  ],
  migrations: [
    InitialWorkspaceSchema1729958400000,
    AddDeveloperRole1730707200000,
    AddRoleBasedInvitations1730793600000,
  ],
  synchronize: false,
  migrationsRun: true,
  logging: process.env.NODE_ENV === "development",
  timezone: "Z",
});
