# Collaborative Work Management Platform

A React and TypeScript work-management app with a Vite frontend and an Express API backed by MySQL. The interface includes a dashboard, task list and board, project views, workspace navigation, authentication screens, and demo mode.

## Requirements

- Node.js compatible with Vite 8
- npm
- MySQL 8 or another compatible MySQL server

## Getting started

1. Install the project dependencies:

   ```sh
   npm install
   ```

2. Configure the environment variables in `.env` (do not commit secrets):

   ```dotenv
   API_PORT=4000
   JWT_SECRET=replace-with-a-long-random-secret
   WEB_ORIGIN=http://localhost:8443
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=workspace_pm
   DB_PASSWORD=your-database-password
   DB_NAME=workspace_pm
   VITE_API_URL=http://localhost:4000/api/v1
   ```

   The database must exist and the configured MySQL user must have permission to create and modify tables. `JWT_SECRET` is required by the API. The server defaults to port `4000`; Vite uses port `8443`.

3. Apply the database migration:

   ```sh
   npm run db:migrate
   ```

4. Start the API and frontend in separate terminals:

   ```sh
   npm run server:dev
   ```

   ```sh
   npm run dev
   ```

   Open `http://localhost:8443`. The server also runs pending migrations when it starts.

## Demo mode and data persistence

Choose **Explore the demo workspace** on the login page to use the app without an API account. Demo task and project changes are saved in browser `localStorage` under `workspace-pm-ui-data`; they are not written to MySQL and are local to that browser.

Registration, login, workspace creation, and the health check use the API. The API also provides authenticated endpoints for listing workspaces, projects, tasks, and dashboard data. Task and project creation or updates in the frontend currently use browser storage rather than backend endpoints; they will not sync between browsers or appear in database-backed accounts.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production frontend build in `dist/` |
| `npm run preview` | Preview the production build |
| `npm run server:dev` | Start the API with automatic reload |
| `npm run server:start` | Start the API |
| `npm run db:migrate` | Apply pending MySQL migrations |
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
| `POST` | `/auth/register` | Register an account |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/me` | Get the authenticated user |
| `GET` | `/workspaces` | List the authenticated user's workspaces |
| `POST` | `/workspaces` | Create a workspace |
| `GET` | `/workspaces/:workspaceId/projects` | List workspace projects |
| `GET` | `/workspaces/:workspaceId/tasks` | List and filter workspace tasks |
| `GET` | `/workspaces/:workspaceId/dashboard` | Get workspace dashboard data |

Routes other than health, registration, and login require a bearer token. Workspace-specific routes also require active workspace membership.

## Project layout

- `src/app/` — React routes, pages, UI components, API client, and demo data store
- `src/index.css` — Global and Tailwind styles
- `server/` — Express API, TypeORM entities, data source, and migrations
- `vite.config.ts` — Vite, React, Tailwind CSS, and development-server configuration
