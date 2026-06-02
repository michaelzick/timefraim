import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api-client";

function getKanbanErrorMessage(message: string, error: unknown) {
  if (error instanceof ApiRequestError && error.code === "dependency_unavailable") {
    return error.message;
  }

  if (error instanceof Error && error.message.startsWith("Schedule conflict with ")) {
    const title = error.message.slice("Schedule conflict with ".length).trim();
    return `Tasks can't overlap on the timeline. This change would overlap with "${title}".`;
  }

  if (error instanceof Error && error.message === "No open timeline slot is available for this task.") {
    return error.message;
  }

  return message;
}

export function showKanbanActionError(message: string, error: unknown) {
  const displayMessage = getKanbanErrorMessage(message, error);
  console.error(displayMessage, error);
  toast.error(displayMessage, { duration: 8000 });
}
