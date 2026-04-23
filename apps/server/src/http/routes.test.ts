import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedUser } = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("./auth.js", () => ({
  requireAuthenticatedUser,
}));

import { registerAuthRoutes } from "./register-auth-routes.js";
import { registerIntegrationRoutes } from "./register-integration-routes.js";
import { registerPlannerRoutes } from "./register-planner-routes.js";
import type { PlannerService } from "../services/planner-service.js";

function createPlannerServiceMock() {
  return {
    applyChange: vi.fn().mockResolvedValue({ status: "applied", kind: "task.create", diffSummary: "Create task" }),
    confirmDraft: vi.fn().mockResolvedValue({ id: "draft-1" }),
    deleteOpenAiConnection: vi.fn().mockResolvedValue({ connected: false, apiKeyHint: null, model: "gpt-image-2" }),
    deleteTogglConnection: vi.fn().mockResolvedValue({ connected: false }),
    discoverTogglConnection: vi.fn().mockResolvedValue({ availableProjects: [], availableWorkspaces: [] }),
    getDayPlan: vi.fn().mockResolvedValue({ tasks: [] }),
    getIntegrationStatus: vi.fn().mockResolvedValue({
      googleConnected: true,
      googleEmail: "allowed@example.com",
      googleCalendarId: "primary",
      togglConnected: true,
      togglWorkspaceId: "workspace-1",
      togglWorkspaceName: "Personal",
      togglDefaultProjectId: "project-1",
      togglDefaultProjectName: "Deep Work",
      togglHasSavedToken: true,
      togglApiTokenHint: "••••7890",
      mcpFullAccessConfigured: true,
      mcpReadOnlyConfigured: true,
      tunnelBaseUrl: "https://example.ngrok.app",
    }),
    getOpenAiImageSettings: vi.fn().mockResolvedValue({ connected: false, apiKeyHint: null, model: "gpt-image-2" }),
    getTogglSettings: vi.fn().mockResolvedValue({ connected: true }),
    generateOpenAiImage: vi.fn().mockResolvedValue({
      imageBase64: "base64-image-data",
      mimeType: "image/png",
      revisedPrompt: null,
      model: "gpt-image-2",
    }),
    rejectDraft: vi.fn().mockResolvedValue({ id: "draft-1" }),
    saveGoogleSession: vi.fn().mockResolvedValue({ ok: true }),
    saveOpenAiConnection: vi.fn().mockResolvedValue({ connected: true, apiKeyHint: "••••1234", model: "gpt-image-2" }),
    saveTogglConnection: vi.fn().mockResolvedValue({ ok: true }),
    syncGoogleCalendar: vi.fn().mockResolvedValue([]),
  };
}

async function createApp(registerRoutes: (app: ReturnType<typeof Fastify>, service: PlannerService) => void) {
  const app = Fastify();
  const plannerService = createPlannerServiceMock();
  registerRoutes(app, plannerService as unknown as PlannerService);
  return { app, plannerService };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("HTTP routes", () => {
  it("serves health and rejects unauthenticated auth requests", async () => {
    const { app, plannerService } = await createApp(registerAuthRoutes);
    requireAuthenticatedUser.mockRejectedValueOnce(new Error("Missing bearer token"));

    const healthResponse = await app.inject({ method: "GET", url: "/health" });
    const authResponse = await app.inject({ method: "GET", url: "/api/auth/me" });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toEqual({ ok: true });
    expect(authResponse.statusCode).toBe(401);
    expect(plannerService.getIntegrationStatus).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns the signed-in auth session payload", async () => {
    const { app, plannerService } = await createApp(registerAuthRoutes);
    requireAuthenticatedUser.mockResolvedValueOnce({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: "https://example.com/avatar.png",
    });

    const response = await app.inject({ method: "GET", url: "/api/auth/me" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
        email: "allowed@example.com",
        displayName: "Allowed User",
        avatarUrl: "https://example.com/avatar.png",
      },
      integrationStatus: await plannerService.getIntegrationStatus.mock.results[0]?.value,
    });

    await app.close();
  });

  it("rejects invalid integration payloads and accepts valid Toggl config", async () => {
    const { app, plannerService } = await createApp(registerIntegrationRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/toggl/connect",
      payload: {},
    });
    const validResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/toggl/connect",
      payload: {
        apiToken: "test-token",
        workspaceId: "workspace-2",
        defaultProjectId: "project-7",
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(validResponse.statusCode).toBe(200);
    expect(plannerService.saveTogglConnection).toHaveBeenCalledWith("84a87ef5-f143-4b9b-9f6b-b7c608d72af0", {
      apiToken: "test-token",
      workspaceId: "workspace-2",
      defaultProjectId: "project-7",
    });

    await app.close();
  });

  it("validates OpenAI image payloads and forwards valid requests", async () => {
    const { app, plannerService } = await createApp(registerIntegrationRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidConnectResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/connect",
      payload: {},
    });
    const validConnectResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/connect",
      payload: { apiKey: "sk-test-1234" },
    });
    const validGenerateResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/images",
      payload: { prompt: "Paint a sunrise over the ocean." },
    });

    expect(invalidConnectResponse.statusCode).toBe(400);
    expect(validConnectResponse.statusCode).toBe(200);
    expect(validGenerateResponse.statusCode).toBe(200);
    expect(plannerService.saveOpenAiConnection).toHaveBeenCalledWith("sk-test-1234");
    expect(plannerService.generateOpenAiImage).toHaveBeenCalledWith("Paint a sunrise over the ocean.");

    await app.close();
  });

  it("rejects invalid planner payloads and accepts task creation", async () => {
    const { app, plannerService } = await createApp(registerPlannerRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {},
    });
    const validResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(validResponse.statusCode).toBe(200);
    expect(plannerService.applyChange).toHaveBeenCalledWith(
      "task.create",
      {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      },
      "user",
      "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
    );

    await app.close();
  });
});
