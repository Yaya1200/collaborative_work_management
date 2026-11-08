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

New accounts are created from a workspace invitation. The signup page displays the role assigned by that invitation, and the API derives membership permissions from the stored invitation rather than a role submitted by the browser. Invitations expire after seven days and can only be used once. Only workspace Owners can invite new members, including Project Managers, Team Leaders, Developers, and Testers.

Team invitations are emailed through EmailJS. Configure `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` in the local `.env` file. Configure the EmailJS template's recipient as `{{to_email}}` and include `{{invitation_url}}`, `{{workspace_name}}`, `{{workspace_role}}`, `{{inviter_name}}`, and `{{expires_in}}` in the message. Restrict the EmailJS allowed origins to the app's domains. Invitation links use the origin serving the app. If delivery fails, the invitation link remains available to copy or retry.

The supported workspace roles are owner, project manager, team leader, member, and tester. Owners see the Overview and owner controls; Project Managers have the full workspace navigation and day-to-day pages. Owners can cancel projects and tasks and deactivate or reactivate their workspace. Deactivation retains workspace data and makes the workspace read-only until reactivated. The role migration preserves workspace ownership, maps other administrator accounts to project manager, developer accounts to member, and viewer accounts to tester. Team leader is available for new invitations.

Owners can add members from **Team**. Project Managers can view the role-grouped roster and each member's assigned tasks but cannot invite or create accounts.

Developer accounts see only tasks assigned to them, and only the projects and spaces connected to those tasks. Developers can update their task status. Project Managers can create spaces, create and assign tasks from the Projects page, and see workspace-wide task activity on the Overview. Only Owners can cancel projects or tasks.

Database-backed project/task creation, task assignment/status updates, workspace listing, and health checks use the API. Deactivated workspaces remain readable but reject changes until an Owner reactivates them.

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
| `PATCH` | `/workspaces/:workspaceId/status` | Owner-only workspace deactivation/reactivation |
| `POST` | `/workspaces/:workspaceId/invitations` | Create a role-based invitation (workspace administrators only) |
| `GET` | `/workspaces/:workspaceId/members` | List active workspace members and their roles |
| `GET` | `/workspaces/:workspaceId/developers` | List developers (administrators only) |
| `POST` | `/workspaces/:workspaceId/developers` | Create a developer with a generated password (administrators only) |
| `GET` | `/workspaces/:workspaceId/projects` | List workspace projects |
| `POST` | `/workspaces/:workspaceId/projects` | Create a project and space (administrators only) |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId/status` | Update project status; cancellation is Owner-only |
| `GET` | `/workspaces/:workspaceId/spaces` | List workspace spaces |
| `POST` | `/workspaces/:workspaceId/spaces` | Create a space (Project Managers only) |
| `GET` | `/workspaces/:workspaceId/tasks` | List and filter workspace tasks |
| `POST` | `/workspaces/:workspaceId/tasks` | Create and assign a task (Project Managers only) |
| `PATCH` | `/workspaces/:workspaceId/tasks/:taskId/assignee` | Assign a task to a developer (administrators only) |
| `PATCH` | `/workspaces/:workspaceId/tasks/:taskId/status` | Update task status; cancellation is Owner-only |
| `GET` | `/workspaces/:workspaceId/dashboard` | Get workspace dashboard data |

Routes other than health and login require a bearer token. Workspace-specific routes also require active workspace membership.

## Project layout

- `src/app/` — React routes, pages, UI components, API client, and demo data store
- `src/index.css` — Global and Tailwind styles
- `server/` — Express API, TypeORM entities, data source, and migrations
- `vite.config.ts` — Vite, React, Tailwind CSS, and development-server configuration
