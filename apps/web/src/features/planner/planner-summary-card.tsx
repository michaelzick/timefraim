import type { IntegrationStatus } from "@timefraim/shared";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PlannerSummaryCardProps = {
  date: string;
  integrationStatus: IntegrationStatus;
  isSyncing: boolean;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
};

export function PlannerSummaryCard({
  date,
  integrationStatus,
  isSyncing,
  onDateChange,
  onSyncCalendar,
}: PlannerSummaryCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Daily planner</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Timebox the right work, then protect it.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Planner date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="w-[180px]"
          />
          <Button variant="secondary" onClick={onSyncCalendar} disabled={isSyncing}>
            {isSyncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Sync calendar
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Badge>{integrationStatus.googleConnected ? "Google live" : "Google not connected"}</Badge>
        <Badge>{integrationStatus.togglConnected ? "Toggl live" : "Toggl not connected"}</Badge>
        <Badge>{integrationStatus.tunnelBaseUrl ? "Tunnel ready" : "Tunnel pending"}</Badge>
      </div>
    </Card>
  );
}
