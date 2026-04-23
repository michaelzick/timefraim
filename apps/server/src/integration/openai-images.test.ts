import { afterEach, describe, expect, it, vi } from "vitest";
import { generateOpenAiImage } from "./openai-images.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openai-images integration", () => {
  it("posts a gpt-image-2 generation request and returns the first image payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              b64_json: "base64-image-data",
              revised_prompt: "Refined prompt",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateOpenAiImage({ apiKey: "test-key", prompt: "Paint a sunrise over the ocean." }),
    ).resolves.toEqual({
      imageBase64: "base64-image-data",
      mimeType: "image/png",
      revisedPrompt: "Refined prompt",
      model: "gpt-image-2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const requestBody = requestInit?.body;
    expect(typeof requestBody).toBe("string");
    expect(JSON.parse(requestBody as string)).toEqual(
      expect.objectContaining({
        model: "gpt-image-2",
        prompt: "Paint a sunrise over the ocean.",
        size: "1024x1024",
        quality: "medium",
        background: "auto",
        output_format: "png",
      }),
    );
  });

  it("surfaces OpenAI error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Invalid API key" } }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      generateOpenAiImage({ apiKey: "bad-key", prompt: "Paint a sunrise over the ocean." }),
    ).rejects.toThrow("Invalid API key");
  });
});
