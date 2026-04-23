import { openAiGeneratedImageSchema, type OpenAiGeneratedImage } from "@timefraim/shared";
import { z } from "zod";

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_MODEL = "gpt-image-2";

const openAiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

const openAiImageResponseSchema = z.object({
  data: z
    .array(
      z.object({
        b64_json: z.string().min(1),
        revised_prompt: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

async function readOpenAiError(response: Response) {
  const fallbackMessage = `OpenAI image request failed with status ${response.status}`;
  const body = await response.text();

  if (!body) {
    return fallbackMessage;
  }

  try {
    const parsed = openAiErrorSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data.error.message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function generateOpenAiImage(args: {
  apiKey: string;
  prompt: string;
}): Promise<OpenAiGeneratedImage> {
  const response = await fetch(OPENAI_IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: args.prompt,
      size: "1024x1024",
      quality: "medium",
      background: "auto",
      output_format: "png",
    }),
  });

  if (!response.ok) {
    throw new Error(await readOpenAiError(response));
  }

  const payload = openAiImageResponseSchema.parse(await response.json());
  const image = payload.data[0];

  return openAiGeneratedImageSchema.parse({
    imageBase64: image.b64_json,
    mimeType: "image/png",
    revisedPrompt: image.revised_prompt ?? null,
    model: OPENAI_IMAGE_MODEL,
  });
}
