# Collaborative Work Management Platform

A React and TypeScript work-management app with a Vite frontend and an Express API backed by MySQL. The interface includes administrator and developer portals, task and project views, workspace navigation, and authentication screens.

## Requirements

- Node.js compatible with Vite 8
- npm
- MySQL 8 or another compatible MySQL server

## Getting started

1. Install the project dependencies:

   ```sh
   npm install
   ```

2. Configure the environment variables in `.env`:

   ```dotenv
   API_PORT=4000
   JWT_SECRET=replace-with-a-long-random-secret
   WEB_ORIGIN=http://localhost:8443
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=workspace_pm
   DB_PASSWORD=your-database-password
   DB_NAME=workspace_pm
   ADMIN_NAME=Workspace Administrator
   ADMIN_EMAIL=admin@company.com
   ADMIN_PASSWORD=replace-with-a-strong-password
   ADMIN_WORKSPACE_NAME=Northstar Workspace
   ADMIN_WORKSPACE_SLUG=northstar
   VITE_API_URL=http://localhost:4000/api/v1
   ```

   The database must exist and the configured MySQL user must have permission to create and modify tables. `JWT_SECRET` is required by the API. The seed requires `ADMIN_NAME`, `ADMIN_EMAIL`, and an `ADMIN_PASSWORD` with at least 10 characters. Keep these credentials private. The server defaults to port `4000`; Vite uses port `8443`.

3. Apply the database migration and seed the administrator account and workspace:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

   Re-running the seed updates the configured administrator's name and password, reactivates the account, and ensures its workspace membership has the owner role.

4. Start the API and frontend in separate terminals:

   ```sh
   npm run server:dev
   ```

   ```sh
   npm run dev
   ```

   Open `http://localhost:8443`. The server also runs pending migrations when it starts.

## Authentication and data persistence

New accounts are created from a workspace invitation. The signup page displays the role assigned by that invitation, and the API derives membership permissions from the stored invitation rather than a role submitted by the browser. Invitations expire after seven days and can only be used once; no email is sent automatically. Workspace owners and project managers can create invitations through the API. Only owners can invite other owners or project managers.

The supported workspace roles are owner, project manager, team leader, member, and tester. The role migration preserves workspace ownership, maps other administrator accounts to project manager, developer accounts to member, and viewer accounts to tester. Team leader is available for new invitations.

Administrators can still add members from **Team → Developers**. Each new member receives a generated password; copy and securely share the sign-in link, email, and password shown after creation.

Developer accounts see only tasks assigned to them, and only the projects and spaces connected to those tasks. Developers can update their task status. Administrators can assign existing database-backed workspace tasks to developers from the same Team page.

Use **Team → Create project and space** and **Create and assign task** for work that should appear in developer accounts. The regular task and project creation controls elsewhere in the prototype still save to browser storage and are not shared with developer accounts. Login, developer account management, database-backed project/task creation, task assignment/status updates, workspace listing, and health checks use the API.

Tasks created from the Team page may include an optional start date and end date. The end date cannot be earlier than the start date; developers see the date range on their task list and task details.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production frontend build in `dist/` |
| `npm run preview` | Preview the production build |
| `npm run server:dev` | Start the API with automatic reload |
| `npm run server:start` | Start the API |
| `npm run db:migrate` | Apply pending MySQL migrations |
| `npm run db:seed` | Create or update the seeded administrator and workspace |
| `npm run server:check` | Type-check the server |
| `npm run format` | Format project files with oxfmt |

The frontend can be type-checked with:

```sh
npx tsc --noEmit
```

## API routes

All API routes use the `/api/v1` prefix.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API and database health |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/auth/invitations/:token` | Verify a workspace invitation |
| `POST` | `/auth/register` | Register using a valid workspace invitation |
| `GET` | `/me` | Get the authenticated user |
| `GET` | `/workspaces` | List the authenticated user's workspaces |
| `POST` | `/workspaces` | Create a workspace |
| `POST` | `/workspaces/:workspaceId/invitations` | Create a role-based invitation (workspace administrators only) |
| `GET` | `/workspaces/:workspaceId/developers` | List developers (administrators only) |
| `POST` | `/workspaces/:workspaceId/developers` | Create a developer with a generated password (administrators only) |
| `GET` | `/workspaces/:workspaceId/projects` | List workspace projects |
| `POST` | `/workspaces/:workspaceId/projects` | Create a project and space (administrators only) |
| `GET` | `/workspaces/:workspaceId/spaces` | List workspace spaces |
| `GET` | `/workspaces/:workspaceId/tasks` | List and filter workspace tasks |
| `POST` | `/workspaces/:workspaceId/tasks` | Create and assign a task (administrators only) |
| `PATCH` | `/workspaces/:workspaceId/tasks/:taskId/assignee` | Assign a task to a developer (administrators only) |
| `PATCH` | `/workspaces/:workspaceId/tasks/:taskId/status` | Update a task status |
| `GET` | `/workspaces/:workspaceId/dashboard` | Get workspace dashboard data |

Routes other than health and login require a bearer token. Workspace-specific routes also require active workspace membership.

## Project layout

- `src/app/` — React routes, pages, UI components, API client, and demo data store
- `src/index.css` — Global and Tailwind styles
- `server/` — Express API, TypeORM entities, data source, and migrations
- `vite.config.ts` — Vite, React, Tailwind CSS, and development-server configuration
