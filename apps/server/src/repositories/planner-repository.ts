import type { Queryable } from "../db/pool.ts";
import { mapAuditLog } from "./planner-repository-mappers.ts";
import { PlannerRepositoryPreferencesStore } from "./planner-repository-preferences-store.ts";
import type { CreateAuditLogInput } from "./planner-repository-types.ts";

export type { CalendarEventRecord, IntegrationTokenRow } from "./planner-repository-types.ts";

export class PlannerRepository extends PlannerRepositoryPreferencesStore {
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
    const id = crypto.randomUUID();
    const result = await db.query(
      `insert into public.audit_logs (id, actor_role, action, entity_type, entity_id, diff_summary, payload)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, input.actorRole, input.action, input.entityType, input.entityId, input.diffSummary, input.payload],
    );
    return mapAuditLog(result.rows[0]);
  }
}
