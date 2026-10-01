import { createFileRoute } from "@tanstack/react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

const MODELS = ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"];

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["ANTHROPIC_API_KEY"];
        if (!apiKey) return new Response("Anthropic key is not configured", { status: 500 });

        const body = (await request.json()) as {
          messages: UIMessage[];
          model?: string;
          thinking?: boolean;
        };
        const model: string = body.model && MODELS.includes(body.model) ? body.model : "claude-sonnet-4-5";
        const anthropic = createAnthropic({ apiKey });

        const result = streamText({
          model: anthropic(model),
          system:
            "You are NEON, a sharp, friendly assistant. Use markdown, code blocks with language tags, and be concise unless asked for depth.",
          messages: await convertToModelMessages(body.messages),
          maxOutputTokens: 16000,
          maxRetries: 0,
          abortSignal: request.signal,
          providerOptions: body.thinking
            ? { anthropic: { thinking: { type: "enabled", budgetTokens: 8000 } } }
            : {},
        });

        return result.toUIMessageStreamResponse({
          sendReasoning: true,
          onError: (e) => (e instanceof Error ? e.message : "Something went wrong"),
        });
      },
    },
  },
});
