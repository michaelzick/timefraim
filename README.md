# TimeFraim

Single-user scheduling app scaffolded as a local-first Sunsama-style planner with:

- Vite + React + TypeScript + Tailwind + Radix + shadcn-style UI
- Fastify backend with draft-first scheduling APIs and a remote MCP endpoint
- Shared Zod contracts
- Local Supabase config pinned to host ports `55331` to `55337`

## Setup

1. Enable `pnpm` through Corepack:

   ```bash
   corepack prepare pnpm@10.11.0 --activate
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start local Supabase:

   ```bash
   supabase start
   supabase db reset
   ```

   If you already have local data and just need the latest schema changes, run:

   ```bash
   supabase migration up
   ```

4. Copy values from local Supabase into `.env`:

  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `INTEGRATION_ENCRYPTION_KEY` (generate a long random secret, for example with `openssl rand -base64 32`)

5. Add Google OAuth credentials to `.env`.

6. Connect Toggl from Settings inside the app using a personal API token from <https://track.toggl.com/profile>. TimeFraim stores the token encrypted in the database and lets you choose a workspace, workspace default project, and per-task project overrides.

7. Run the web app and backend:

   ```bash
   pnpm dev
   ```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm check`

## MCP (Model Context Protocol)

TimeFraim exposes a remote MCP endpoint for programmatic access to task management, scheduling, and calendar integration features. This allows AI assistants and other clients to create tasks, manage schedules, and query planning data.

### MCP Setup

1. **Bearer Token**: Copy the `MCP_BEARER_TOKEN` from your `.env` file. This is required for all MCP requests:

   ```bash
   MCP_BEARER_TOKEN=your_token_here
   MCP_READ_ONLY_TOKEN=your_readonly_token_here  # Optional, for read-only access
   ```

2. **MCP Endpoint**: The MCP server runs at:

   ```
   http://127.0.0.1:4000/mcp
   ```

3. **Claude Code Integration**: To use TimeFraim MCP with Claude Code, configure it in `.claude/.mcp.json`:

   ```json
   {
     "mcpServers": {
       "timefraimMCP": {
         "type": "http",
         "url": "http://127.0.0.1:4000/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_MCP_BEARER_TOKEN"
         }
       }
     }
   }
   ```

   Then enable it in `.claude/settings.json`:

   ```json
   {
     "enabledMcpjsonServers": ["timefraimMCP"]
   }
   ```

### Available Commands (Tools)

#### Read-Only Tools

These tools are available with both the full-access and read-only tokens.

**1. `list_tasks`**
- **Description**: Return all current tasks in the planner
- **Input**: None
- **Output**: Array of all tasks with their properties (title, priority, status, duration, notes, etc.)
- **Example**:
  ```json
  {
    "method": "list_tasks",
    "params": {}
  }
  ```

**2. `list_calendar_view`**
- **Description**: Return the combined Google Calendar blockers for a given day
- **Input**: 
  - `date` (optional): ISO date string (e.g., "2026-05-05"). Defaults to today.
- **Output**: Array of calendar events/blockers for the specified day
- **Example**:
  ```json
  {
    "method": "list_calendar_view",
    "params": {
      "date": "2026-05-05"
    }
  }
  ```

**3. `get_day_plan`**
- **Description**: Return the full daily planning snapshot (tasks, calendar events, schedule blocks, and metadata)
- **Input**:
  - `date` (optional): ISO date string (e.g., "2026-05-05"). Defaults to today.
- **Output**: Complete day plan object with tasks, calendar events, schedule blocks, active timer, etc.
- **Example**:
  ```json
  {
    "method": "get_day_plan",
    "params": {
      "date": "2026-05-05"
    }
  }
  ```

#### Full-Access Tools (Draft-First Workflow)

These tools are only available with the `MCP_BEARER_TOKEN`. They follow a draft-first pattern: propose a change (creates a pending draft), then confirm it after user approval.

**4. `propose_task_create`**
- **Description**: Create a pending draft for a new task
- **Input**:
  - `title` (required): Task title
  - `priority` (optional): "low" | "medium" | "high" | "urgent"
  - `estimatedMinutes` (optional): Estimated duration in minutes
  - `status` (optional): "inbox" | "scheduled" | "inprogress" | "completed"
  - `notes` (optional): Task notes/description
  - `plannerDate` (required): ISO date string (e.g., "2026-05-05")
- **Output**: Draft object with `draftId` for confirmation
- **Example**:
  ```json
  {
    "method": "propose_task_create",
    "params": {
      "title": "Complete project proposal",
      "priority": "high",
      "estimatedMinutes": 90,
      "status": "inbox",
      "notes": "Quarterly business plan update",
      "plannerDate": "2026-05-05"
    }
  }
  ```

**5. `propose_task_duplicate`**
- **Description**: Create a pending draft that duplicates an existing task
- **Input**:
  - `taskId` (required): ID of the task to duplicate
  - `plannerDate` (required): ISO date string for the new task
- **Output**: Draft object with `draftId` for confirmation
- **Example**:
  ```json
  {
    "method": "propose_task_duplicate",
    "params": {
      "taskId": "task-uuid-here",
      "plannerDate": "2026-05-06"
    }
  }
  ```

**6. `propose_schedule_block_create`**
- **Description**: Create a pending draft for a new scheduled work block
- **Input**:
  - `taskId` (optional): Link block to a task
  - `startTime` (required): ISO timestamp (e.g., "2026-05-05T14:00:00Z")
  - `endTime` (required): ISO timestamp (e.g., "2026-05-05T15:30:00Z")
  - `label` (optional): Block label/name
- **Output**: Draft object with `draftId` for confirmation
- **Example**:
  ```json
  {
    "method": "propose_schedule_block_create",
    "params": {
      "taskId": "task-uuid-here",
      "startTime": "2026-05-05T14:00:00Z",
      "endTime": "2026-05-05T15:30:00Z",
      "label": "Deep work session"
    }
  }
  ```

**7. `propose_schedule_block_update`**
- **Description**: Create a pending draft for moving or resizing a schedule block
- **Input**:
  - `blockId` (required): ID of the schedule block to update
  - `startTime` (required): New start time (ISO timestamp)
  - `endTime` (required): New end time (ISO timestamp)
- **Output**: Draft object with `draftId` for confirmation
- **Example**:
  ```json
  {
    "method": "propose_schedule_block_update",
    "params": {
      "blockId": "block-uuid-here",
      "startTime": "2026-05-05T15:00:00Z",
      "endTime": "2026-05-05T16:30:00Z"
    }
  }
  ```

**8. `propose_schedule_block_delete`**
- **Description**: Create a pending draft for deleting a scheduled block
- **Input**:
  - `blockId` (required): ID of the schedule block to delete
- **Output**: Draft object with `draftId` for confirmation
- **Example**:
  ```json
  {
    "method": "propose_schedule_block_delete",
    "params": {
      "blockId": "block-uuid-here"
    }
  }
  ```

**9. `confirm_draft`**
- **Description**: Apply a pending draft after explicit user approval
- **Input**:
  - `draftId` (required): UUID of the draft to confirm
- **Output**: Confirmed draft with `status: "applied"` timestamp
- **Example**:
  ```json
  {
    "method": "confirm_draft",
    "params": {
      "draftId": "draft-uuid-here"
    }
  }
  ```

**10. `start_task_timer`**
- **Description**: Start a Toggl-backed timer for a task by creating and applying a timer draft
- **Input**:
  - `taskId` (required): ID of the task to start timer for
  - `toggleTaskId` (optional): Override Toggl task ID
- **Output**: Draft object showing active timer state
- **Example**:
  ```json
  {
    "method": "start_task_timer",
    "params": {
      "taskId": "task-uuid-here"
    }
  }
  ```

**11. `stop_active_timer`**
- **Description**: Stop the currently running timer by creating a pending draft
- **Input**: None (operates on the active timer)
- **Output**: Draft object showing stopped timer
- **Example**:
  ```json
  {
    "method": "stop_active_timer",
    "params": {}
  }
  ```

### Authentication Profiles

- **Full-Access** (`MCP_BEARER_TOKEN`): All 11 tools available, can create/modify tasks, schedule blocks, and timers
- **Read-Only** (`MCP_READ_ONLY_TOKEN`): Only `list_tasks`, `list_calendar_view`, and `get_day_plan` available

### Example Workflow

1. **List today's tasks**:
   ```json
   {"method": "list_tasks", "params": {}}
   ```

2. **Create a new task** (propose):
   ```json
   {
     "method": "propose_task_create",
     "params": {
       "title": "Review meeting notes",
       "priority": "medium",
       "estimatedMinutes": 30,
       "plannerDate": "2026-05-05"
     }
   }
   ```

3. **Confirm the task** (apply):
   ```json
   {
     "method": "confirm_draft",
     "params": {
       "draftId": "draft-id-from-step-2"
     }
   }
   ```

4. **Schedule time for the task**:
   ```json
   {
     "method": "propose_schedule_block_create",
     "params": {
       "taskId": "task-id-from-step-3",
       "startTime": "2026-05-05T10:00:00Z",
       "endTime": "2026-05-05T10:30:00Z"
     }
   }
   ```

5. **Confirm the schedule block**:
   ```json
   {
     "method": "confirm_draft",
     "params": {
       "draftId": "draft-id-from-step-4"
     }
   }
   ```
