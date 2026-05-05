# TimeFraim MCP Connection Guide

## Skill Overview

This skill provides step-by-step instructions for connecting to the TimeFraim Model Context Protocol (MCP) endpoint and working with available tools. Use this when building agents, integrations, or automation that interact with the TimeFraim planner.

---

## 1. MCP Endpoint & Authentication

### Server Details
- **Endpoint:** `POST /mcp` on the TimeFraim backend server
- **Transport:** HTTP Streamable (via `@modelcontextprotocol/sdk`)
- **Host:** Typically `http://localhost:4000` (development) or deployed URL
- **Authentication:** Bearer token in `Authorization` header

### Bearer Tokens
The server has two token types:

| Token | Env Var | Access Level | Use Case |
|---|---|---|---|
| **Full Access** | `MCP_BEARER_TOKEN` | Read + write tools, draft confirmation | Internal agents, trusted integrations |
| **Read Only** | `MCP_READ_ONLY_TOKEN` | Read-only tools | External agents, auditing, monitoring |

Both tokens are set as environment variables on the server and should be kept secure.

---

## 2. Available Tools

### Read-Only Tools
These tools work with both token types:

#### `list_tasks()`
Returns all tasks in the planner.

**Returns:**
```typescript
{
  tasks: Array<{
    id: string
    title: string
    status: "pending" | "active" | "completed" | "cancelled"
    priority: "low" | "medium" | "high" | "urgent"
    estimatedMinutes: number | null
    notes: string | null
    togglProjectId: string | null
    createdAt: string // ISO 8601
    updatedAt: string // ISO 8601
  }>
}
```

#### `list_calendar_view(startDate, endDate, timeZone)`
Returns scheduled time blocks and synced calendar events for a date range.

**Parameters:**
- `startDate`: ISO 8601 date string (YYYY-MM-DD)
- `endDate`: ISO 8601 date string (YYYY-MM-DD)
- `timeZone`: IANA timezone string (e.g., "America/Los_Angeles")

**Returns:**
```typescript
{
  calendarView: Array<{
    id: string
    type: "schedule_block" | "calendar_event"
    title: string
    startTime: string // ISO 8601
    endTime: string // ISO 8601
    taskId?: string // present if type is schedule_block
    provider?: string // present if type is calendar_event (e.g., "google")
    color?: string // hex color code
  }>
}
```

#### `get_day_plan(date, timeZone)`
Returns aggregated view of all tasks and scheduled blocks for a single day.

**Parameters:**
- `date`: ISO 8601 date string (YYYY-MM-DD)
- `timeZone`: IANA timezone string

**Returns:**
```typescript
{
  dayPlan: {
    date: string // YYYY-MM-DD
    tasks: Task[]
    scheduleBlocks: ScheduleBlock[]
    summary: { totalBlockedMinutes: number, tasksScheduled: number }
  }
}
```

### Write Tools (Full Access Only)
Require `MCP_BEARER_TOKEN`. These return a draft object instead of applying directly — see **Draft Workflow** below.

#### `propose_task_create(title, priority?, estimatedMinutes?, notes?)`
Creates a new task.

**Parameters:**
- `title`: string (required)
- `priority`: "low" | "medium" | "high" | "urgent" (default: "medium")
- `estimatedMinutes`: number (optional)
- `notes`: string (optional)

**Returns:** Draft object (see **Confirming Drafts** section)

#### `propose_schedule_block_create(taskId, startTime, endTime, calendarEventId?)`
Schedules a task on the timeline.

**Parameters:**
- `taskId`: string (required)
- `startTime`: ISO 8601 datetime string
- `endTime`: ISO 8601 datetime string
- `calendarEventId`: string (optional, link to synced Google Calendar event)

**Returns:** Draft object

#### `propose_schedule_block_update(blockId, startTime?, endTime?, calendarEventId?)`
Reschedules or updates a time block.

**Parameters:**
- `blockId`: string (required, the schedule_block ID)
- `startTime`: ISO 8601 datetime string (optional)
- `endTime`: ISO 8601 datetime string (optional)
- `calendarEventId`: string (optional)

**Returns:** Draft object

#### `propose_schedule_block_delete(blockId)`
Removes a schedule block.

**Parameters:**
- `blockId`: string (required)

**Returns:** Draft object

#### `propose_task_update(taskId, title?, status?, priority?, estimatedMinutes?, notes?, togglProjectId?)`
Updates task properties.

**Parameters:**
- `taskId`: string (required)
- `status`: "pending" | "active" | "completed" | "cancelled" (optional)
- Other fields as needed

**Returns:** Draft object

#### `start_task_timer(taskId, togglProjectId?)`
Starts a Toggl timer for a task.

**Parameters:**
- `taskId`: string (required)
- `togglProjectId`: string (optional, overrides task default)

**Returns:** Timer session object

#### `stop_active_timer()`
Stops the currently running timer.

**Parameters:** none

**Returns:** Timer session object with final duration

### Draft Workflow

When you call a `propose_*` tool, you get a draft object:

```typescript
{
  id: string
  kind: "task_create" | "schedule_block_create" | "schedule_block_update" | "schedule_block_delete" | "task_update"
  status: "pending" | "applied" | "rejected"
  payload: object // the change details
  actorRole: "agent" | "user"
  createdAt: string
  expiresAt: string // drafts auto-expire after 24 hours
}
```

**To apply the draft**, use `confirm_draft(draftId)` — this is a write operation that applies all pending changes.

#### `confirm_draft(draftId)`
Applies a proposed change.

**Parameters:**
- `draftId`: string (required)

**Returns:**
```typescript
{
  success: boolean
  draft: DraftObject
  appliedChanges: object[]
  sideEffects?: {
    googleCalendarSync?: boolean
    togglSync?: boolean
  }
}
```

---

## 3. Client Setup Examples

### Node.js (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HTTPClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

// Connect via HTTP to the TimeFraim server
const transport = new HTTPClientTransport({
  url: "http://localhost:4000/mcp",
  headers: {
    Authorization: `Bearer ${process.env.MCP_BEARER_TOKEN}`,
  },
});

const client = new Client(
  {
    name: "my-agent",
    version: "1.0.0",
  },
  {
    capabilities: {
      roots: {
        listChanged: false,
      },
    },
  }
);

await client.connect(transport);

// Now call tools
const tasks = await client.callTool("list_tasks", {});
console.log(tasks);

await client.close();
```

### Python

```python
import os
import json
import httpx
from typing import Any

class TimeFraimMCPClient:
    def __init__(self, base_url: str = "http://localhost:4000/mcp", token: str = None):
        self.base_url = base_url
        self.token = token or os.getenv("MCP_BEARER_TOKEN")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
    
    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict:
        """Call an MCP tool"""
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
            "id": 1,
        }
        
        with httpx.Client() as client:
            response = client.post(self.base_url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()

# Usage
client = TimeFraimMCPClient()
tasks = client.call_tool("list_tasks", {})
print(json.dumps(tasks, indent=2))
```

---

## 4. Common Patterns for LLM Agents

### Pattern 1: Read-First Discovery
Always start with read-only tools to understand state:

```
1. call list_tasks() → understand what tasks exist
2. call list_calendar_view(startDate, endDate, tz) → see current schedule
3. call get_day_plan(specificDate, tz) → deep dive on a single day
```

### Pattern 2: Proposing a Change Sequence
Agents should propose changes one at a time and confirm each:

```
1. call propose_task_create("New task", priority="high")
   → returns draftId
2. Review the draft with the user or validation logic
3. call confirm_draft(draftId)
   → change is now applied
```

### Pattern 3: Scheduling a Task
Common flow to take a task and put it on the calendar:

```
1. call list_tasks() → find taskId
2. call list_calendar_view(date, tz) → find free slots
3. call propose_schedule_block_create(taskId, startTime, endTime)
4. call confirm_draft(draftId)
```

### Pattern 4: Timer Workflow
Start and stop Toggl timers:

```
1. call start_task_timer(taskId)
   → returns { id, taskId, startedAt, ... }
2. ... work happens ...
3. call stop_active_timer()
   → returns { id, taskId, durationSeconds, ... }
```

---

## 5. Error Handling

MCP tools return error responses if:
- **401 Unauthorized** — bearer token is missing or invalid
- **403 Forbidden** — token is read-only but write tool was called
- **400 Bad Request** — parameters are invalid or required fields missing
- **404 Not Found** — referenced task/block doesn't exist
- **409 Conflict** — e.g., trying to schedule overlapping blocks

Always check the response structure:

```typescript
{
  content: [
    {
      type: "text" | "error",
      text?: string // successful result or error message
    }
  ]
}
```

---

## 6. Best Practices

1. **Always use read-only token for discovery** — use the full token only for confirmed changes.
2. **Batch independent reads** — call `list_tasks()` and `list_calendar_view()` in parallel if possible.
3. **Handle draft expiry** — drafts auto-expire after 24 hours; confirm promptly.
4. **Validate dates in user timezone** — always pass the `tz` parameter matching the user's timezone.
5. **Chain operations carefully** — if an agent needs task ID output from a create, confirm the draft first.
6. **Check tool availability** — query the server's `tools/list` method to see what tools are available for your token.
7. **Respect rate limits** — the server doesn't enforce strict limits, but avoid hammering it with requests.

---

## 7. Debugging & Introspection

### List Available Tools
Send an MCP request to discover tools:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

### Server Health Check
Make a simple HTTP GET to ensure the server is up:

```bash
curl http://localhost:4000/health
```

---

## 8. Environment & Deployment

### Local Development
- Server runs on `http://localhost:4000` (see `PORT` env var)
- Tokens are set in `.env` file (see `.env.example`)

### Production / Remote
- Server is deployed and accessible via a public URL
- Use `TUNNEL_PUBLIC_BASE_URL` for the public MCP endpoint
- Rotate bearer tokens periodically
- Use HTTPS (not HTTP) in production

---

## See Also

- **[CLAUDE.md](../../CLAUDE.md)** — Full project orientation including database schema and service architecture
- **[.env.example](../../.env.example)** — Environment variable reference
- **[apps/server/src/mcp/create-mcp-server.ts](../../apps/server/src/mcp/create-mcp-server.ts)** — MCP tool implementation details
