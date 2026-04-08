import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase";

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          startTransition(() => setSession(data.session));
        }
      } catch (error) {
        console.error(error);
      }
    };
    void loadSession();

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
