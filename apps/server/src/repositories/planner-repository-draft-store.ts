import { randomUUID } from "node:crypto";
import type { DraftStatus, SyncDraft } from "@timefraim/shared";
import type { Queryable } from "../db/pool.js";
import { mapDraft } from "./planner-repository-mappers.js";
import { PlannerRepositoryIntegrationStore } from "./planner-repository-integration-store.js";
import type { CreateDraftInput } from "./planner-repository-types.js";

export class PlannerRepositoryDraftStore extends PlannerRepositoryIntegrationStore {
  async createDraft(input: CreateDraftInput, db: Queryable): Promise<SyncDraft> {
    const id = randomUUID();
    const result = await db.query(
      `insert into public.sync_drafts (id, owner_user_id, kind, payload, diff_summary, actor_role, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, input.ownerUserId, input.kind, input.payload, input.diffSummary, input.actorRole, input.expiresAt],
    );
    return mapDraft(result.rows[0]);
  }

  async getDraft(draftId: string, db: Queryable): Promise<SyncDraft | null> {
    const result = await db.query(`select * from public.sync_drafts where id = $1 limit 1`, [draftId]);
    return result.rows[0] ? mapDraft(result.rows[0]) : null;
  }

  async listDrafts(status: DraftStatus | null, ownerUserId: string | null, db: Queryable): Promise<SyncDraft[]> {
    const result = status
      ? await db.query(
          `select *
           from public.sync_drafts
           where status = $1
             and ($2::uuid is null or owner_user_id = $2)
           order by created_at desc
           limit 25`,
          [status, ownerUserId],
        )
      : await db.query(
          `select *
           from public.sync_drafts
           where ($1::uuid is null or owner_user_id = $1)
           order by created_at desc
           limit 25`,
          [ownerUserId],
        );
    return result.rows.map(mapDraft);
  }

  async updateDraftStatus(draftId: string, status: DraftStatus, db: Queryable): Promise<SyncDraft> {
    const timestampColumn = status === "applied" ? "applied_at" : status === "rejected" ? "rejected_at" : null;
    const result = timestampColumn
      ? await db.query(
          `update public.sync_drafts
           set status = $2, ${timestampColumn} = timezone('utc', now())
           where id = $1
           returning *`,
          [draftId, status],
        )
      : await db.query(
          `update public.sync_drafts
           set status = $2
           where id = $1
           returning *`,
          [draftId, status],
        );
    return mapDraft(result.rows[0]);
  }
}
