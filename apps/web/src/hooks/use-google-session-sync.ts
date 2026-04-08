import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

type OAuthSession = Session & {
  provider_token?: string;
  provider_refresh_token?: string;
};

type UseGoogleSessionSyncOptions = {
  session: Session | null;
  token: string;
  onSynced: () => Promise<void>;
};

export function useGoogleSessionSync({ session, token, onSynced }: UseGoogleSessionSyncOptions) {
  const syncedGoogleSessionSignature = useRef<string | null>(null);

  useEffect(() => {
    const oauthSession = session as OAuthSession | null;
    const providerToken = oauthSession?.provider_token;
    const providerRefreshToken = oauthSession?.provider_refresh_token ?? null;
    const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
    const sessionSignature = providerToken ? [providerToken, providerRefreshToken ?? "", expiresAt ?? ""].join("|") : null;

    if (!providerToken || sessionSignature === syncedGoogleSessionSignature.current || !token) {
      return;
    }

    syncedGoogleSessionSignature.current = sessionSignature;
    const syncGoogleSession = async () => {
      try {
        await api.saveGoogleSession(token, {
          accessToken: providerToken,
          refreshToken: providerRefreshToken,
          expiresAt,
          email: session?.user.email ?? "",
          calendarId: "primary",
        });
        await onSynced();
      } catch (error) {
        console.error(error);
        syncedGoogleSessionSignature.current = null;
      }
    };

    void syncGoogleSession();
  }, [onSynced, session, token]);
}
