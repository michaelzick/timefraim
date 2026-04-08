import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function LoginView() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] items-center px-6">
      <Card className="w-full p-8">
        <Badge>Single-user planner</Badge>
        <h1 className="mt-5 text-4xl font-semibold text-white">Sculpt your day before it gets stolen.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted-strong)]">
          TimeFraim reads your primary Google Calendar, creates app-managed focus blocks, syncs Toggl timers,
          and exposes a guarded MCP endpoint for Claude and ChatGPT.
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin,
                scopes:
                  "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
                queryParams: {
                  access_type: "offline",
                  prompt: "consent",
                },
              },
            });
          }}
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
      </Card>
    </div>
  );
}
