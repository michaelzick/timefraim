import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlannerToolbar } from "@/features/planner/planner-toolbar";

function renderToolbar(status: "not_synced" | "fully_synced" | "partially_synced") {
  render(
    <PlannerToolbar
      date="2026-04-06"
      isSyncing={false}
      linkedGoogleEmail="allowed@example.com"
      calendarSync={{
        status,
        syncedAt: status === "not_synced" ? null : "2026-04-06T09:00:00.000Z",
        hiddenEventCount: status === "partially_synced" ? 1 : 0,
      }}
      onDateChange={vi.fn()}
      onSyncCalendar={vi.fn()}
      categoryFilter="all"
      onCategoryFilterChange={vi.fn()}
    />,
  );
}

describe("PlannerToolbar", () => {
  it("shows no calendar sync indicator before the viewed day has been synced", () => {
    renderToolbar("not_synced");

    expect(screen.getByText(/synced with allowed@example.com/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/calendar fully synced/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/calendar partially synced/i)).not.toBeInTheDocument();
  });

  it("shows a green circular check when the viewed day is fully synced", () => {
    renderToolbar("fully_synced");

    expect(screen.getByLabelText(/calendar fully synced/i)).toHaveClass("text-emerald-400");
  });

  it("shows a yellow circular minus when the viewed day is partially synced", () => {
    renderToolbar("partially_synced");

    expect(screen.getByLabelText(/calendar partially synced/i)).toHaveClass("text-amber-300");
  });
});
