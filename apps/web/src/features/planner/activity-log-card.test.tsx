import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buildDayPlan } from "@/test/fixtures";
import { ActivityLogCard } from "@/features/planner/activity-log-card";

describe("ActivityLogCard", () => {
  it("renders display summaries and full timestamps when expanded", async () => {
    const user = userEvent.setup();
    const dayPlan = buildDayPlan({
      auditLogs: [
        {
          id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
          actorRole: "user",
          action: "timer.start",
          entityType: "timer_session",
          entityId: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
          diffSummary: "Start timer for task task-1",
          displaySummary: 'Start timer for task "Journal"',
          payload: { taskId: "task-1" },
          createdAt: "2026-04-20T06:54:38",
        },
      ],
    });

    render(<ActivityLogCard dayPlan={dayPlan} />);

    await user.click(screen.getByRole("button", { name: /today's changes/i }));

    expect(screen.getByText('Start timer for task "Journal"')).toBeInTheDocument();
    expect(screen.queryByText("Start timer for task task-1")).not.toBeInTheDocument();
    expect(screen.getByText("04/20/2026 6:54:38 AM")).toBeInTheDocument();
  });
});
