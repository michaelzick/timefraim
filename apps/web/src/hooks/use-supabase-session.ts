import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase";

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        startTransition(() => setSession(data.session));
      }
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        startTransition(() => setSession(nextSession));
      },
    );

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}
