import { randomUUID } from "node:crypto";
import type { Queryable } from "../db/pool.js";
import { mapAuditLog } from "./planner-repository-mappers.js";
import { PlannerRepositoryTimerStore } from "./planner-repository-timer-store.js";
import type { CreateAuditLogInput } from "./planner-repository-types.js";

export type { CalendarEventRecord, IntegrationTokenRow } from "./planner-repository-types.js";

export class PlannerRepository extends PlannerRepositoryTimerStore {
  async listRecentAuditLogs(db: Queryable) {
    const result = await db.query(
      `select *
       from public.audit_logs
       order by created_at desc
       limit 25`,
    );
    return result.rows.map(mapAuditLog);
  }

  async createAuditLog(input: CreateAuditLogInput, db: Queryable) {
    const id = randomUUID();
    const result = await db.query(
      `insert into public.audit_logs (id, actor_role, action, entity_type, entity_id, diff_summary, payload)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, input.actorRole, input.action, input.entityType, input.entityId, input.diffSummary, input.payload],
    );
    return mapAuditLog(result.rows[0]);
  }
}
