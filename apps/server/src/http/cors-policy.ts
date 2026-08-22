const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

// True when the API is talking to a local Supabase stack, which is the edge
// function's equivalent of NODE_ENV !== "production".
export function isLocalSupabaseUrl(supabaseUrl: string) {
  const hostname = hostnameOf(supabaseUrl);
  return hostname !== null && (LOCAL_HOSTNAMES.has(hostname) || hostname === "kong" || hostname === "host.docker.internal");
}

export function createOriginPolicy(options: { allowedOrigins: Iterable<string>; allowLocalOrigins: boolean }) {
  const allowedOrigins = new Set(options.allowedOrigins);
  return (origin: string | undefined) => {
    if (!origin) {
      return true;
    }
    if (allowedOrigins.has(origin)) {
      return true;
    }
    return options.allowLocalOrigins && isLocalOrigin(origin);
  };
}
