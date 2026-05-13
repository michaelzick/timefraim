import type { ActorRole, GooglePlannerSyncTarget } from "@timefraim/shared";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import { applyDraftChange } from "./planner-draft-application.js";
import type { DraftToApply, SideEffect } from "./planner-service-types.js";

export async function applyPlannerDraft(args: {
  draft: DraftToApply;
  actorRole: ActorRole;
  client: Parameters<typeof applyDraftChange>[0]["client"];
  sideEffects: SideEffect[];
  googleConnected: boolean;
  googlePlannerSyncTarget: GooglePlannerSyncTarget;
  syncPlannerBlocksToCalendar: boolean;
  persistDraftStatus: boolean;
  repository: PlannerRepository;
}) {
  const markApplied = () =>
    args.persistDraftStatus && args.draft.id
      ? args.repository.updateDraftStatus(args.draft.id, "applied", args.client)
      : Promise.resolve(null);

  return applyDraftChange({
    actorRole: args.actorRole,
    client: args.client,
    draft: args.draft,
    googleConnected: args.googleConnected,
    googlePlannerSyncTarget: args.googlePlannerSyncTarget,
    syncPlannerBlocksToCalendar: args.syncPlannerBlocksToCalendar,
    markApplied,
    repository: args.repository,
    sideEffects: args.sideEffects,
  });
}
