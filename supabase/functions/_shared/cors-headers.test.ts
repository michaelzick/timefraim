import { assertEquals } from "@std/assert";
import { createCorsHeaders } from "./cors-headers.ts";

const allowOnlyApp = (origin: string | undefined) => origin === "https://app.example.com";

Deno.test("echoes allowed origins with the full CORS header set", () => {
  const headers = createCorsHeaders("https://app.example.com", allowOnlyApp);
  assertEquals(headers["Access-Control-Allow-Origin"], "https://app.example.com");
  assertEquals(headers.Vary, "Origin");
  assertEquals(headers["Access-Control-Expose-Headers"], "x-request-id, mcp-session-id");
});

Deno.test("sends no CORS headers for foreign or missing origins", () => {
  assertEquals(createCorsHeaders("https://evil.example.com", allowOnlyApp), {});
  assertEquals(createCorsHeaders(undefined, allowOnlyApp), {});
});
