import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserPreferences, UserPreferencesUpdate } from "@timefraim/shared";
import { api } from "@/lib/api";
import { useSupabaseSession } from "@/hooks/use-supabase-session";

export function useUserPreferences() {
  const session = useSupabaseSession();
  const token = session?.access_token ?? "";
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-preferences", token],
    enabled: Boolean(token),
    queryFn: ({ signal }) => api.getPreferences(token, signal),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (update: UserPreferencesUpdate) => api.savePreferences(token, update),
    onSuccess: (data: UserPreferences) => {
      queryClient.setQueryData(["user-preferences", token], data);
    },
  });

  return { preferences: query.data ?? null, query, mutation };
}
