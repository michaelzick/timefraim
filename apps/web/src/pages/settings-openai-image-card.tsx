import type { OpenAiGeneratedImage, OpenAiImageSettings } from "@timefraim/shared";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showActionError } from "@/features/planner/planner-page-utils";

const DEFAULT_PROMPT = "A clean desktop planning workspace at sunrise, editorial product illustration.";

function getPreviewSrc(image: OpenAiGeneratedImage | null) {
  return image ? `data:${image.mimeType};base64,${image.imageBase64}` : null;
}

export function SettingsOpenAiImageCard({
  settings,
  isLoading,
  isSaving,
  isGenerating,
  onDelete,
  onGenerate,
  onSave,
}: {
  settings: OpenAiImageSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  onDelete: () => Promise<OpenAiImageSettings>;
  onGenerate: (prompt: string) => Promise<OpenAiGeneratedImage>;
  onSave: (apiKey: string) => Promise<OpenAiImageSettings>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [preview, setPreview] = useState<OpenAiGeneratedImage | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const previewSrc = getPreviewSrc(preview);

  async function runAction(action: () => Promise<void>, message: string) {
    try {
      await action();
    } catch (error) {
      showActionError(message, error);
    }
  }

  async function handleSave() {
    await runAction(async () => {
      await onSave(apiKey.trim());
      setApiKey("");
      setShowApiKeyInput(false);
    }, "Failed to save the OpenAI API key. Please try again.");
  }

  async function handleDelete() {
    await runAction(async () => {
      await onDelete();
      setApiKey("");
      setPreview(null);
      setShowApiKeyInput(false);
    }, "Failed to disconnect OpenAI Images. Please try again.");
  }

  async function handleGenerate() {
    await runAction(async () => {
      const result = await onGenerate(prompt.trim());
      setPreview(result);
    }, "Failed to generate an image with GPT Image 2. Please try again.");
  }

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[rgba(255,111,59,0.12)] p-3 text-[var(--accent)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">OpenAI Images</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--heading)]">GPT Image 2</h2>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--muted-strong)]">
          Uses `gpt-image-2` on the server with 1024x1024 PNG output at medium quality. Your API key is stored encrypted before it hits the database.
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 py-2 text-sm text-[var(--muted-strong)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading OpenAI image settings...
          </div>
        ) : !settings ? (
          <p className="text-sm text-[var(--muted-strong)]">OpenAI image settings are unavailable right now.</p>
        ) : (
          <>
            <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4">
              <p className="text-sm font-medium text-[var(--heading)]">Connection status</p>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                {settings.connected
                  ? `Connected with ${settings.apiKeyHint ?? "a saved API key"}.`
                  : "Not connected yet. Paste an OpenAI API key to enable image generation."}
              </p>
              {(showApiKeyInput || !settings.connected) && (
                <div className="mt-4 space-y-3">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Paste OpenAI API key"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSave()} disabled={isSaving || !apiKey.trim()}>
                      {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      Save OpenAI key
                    </Button>
                    {settings.connected ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setApiKey("");
                          setShowApiKeyInput(false);
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
              {settings.connected && !showApiKeyInput ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setShowApiKeyInput(true)} disabled={isSaving}>
                    Replace key
                  </Button>
                  <Button variant="secondary" onClick={() => void handleDelete()} disabled={isSaving}>
                    {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Disconnect
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Preview prompt</p>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the image you want to generate."
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleGenerate()}
                  disabled={!settings.connected || isGenerating || !prompt.trim()}
                >
                  {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  Generate preview
                </Button>
                {!settings.connected ? (
                  <p className="self-center text-sm text-[var(--muted)]">Save an API key before generating.</p>
                ) : null}
              </div>
            </div>

            {preview && previewSrc ? (
              <div className="space-y-3 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4">
                <p className="text-sm font-medium text-[var(--heading)]">Latest preview</p>
                <img
                  src={previewSrc}
                  alt="Generated GPT Image 2 preview"
                  className="w-full rounded-[24px] border border-[var(--panel-border)] object-cover"
                />
                {preview.revisedPrompt ? (
                  <p className="text-sm text-[var(--muted-strong)]">
                    Revised prompt: {preview.revisedPrompt}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
