import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";

const BASE = "https://ai.gateway.lovable.dev/v1";
const SYSTEM = "You are a helpful assistant. Use markdown and code blocks with language tags. Be concise unless asked for depth.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const body = (await request.json()) as { messages: UIMessage[]; provider?: string };
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const messages = await convertToModelMessages(body.messages);
        const common = { messages, maxRetries: 0, abortSignal: request.signal } as const;

        let result;
        if (body.provider === "claude") {
          const anthropic = createAnthropic({
            baseURL: BASE,
            apiKey,
            headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: runIdFetch.fetch,
          });
          result = streamText({
            ...common,
            model: anthropic("anthropic/claude-opus-5-5"),
            system: SYSTEM,
            maxOutputTokens: 16000,
          });
        } else if (body.provider === "gemini") {
          const lovable = createOpenAICompatible({
            name: "lovable",
            baseURL: BASE,
            apiKey,
            headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: runIdFetch.fetch,
          });
          result = streamText({ ...common, model: lovable("google/gemini-3.8-flash"), system: SYSTEM });
        } else {
          const openai = createOpenAI({
            baseURL: BASE,
            apiKey,
            headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: runIdFetch.fetch,
          });
          result = streamText({
            ...common,
            model: openai.responses("openai/gpt-6-astra"),
            instructions: SYSTEM,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          });
        }

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            onError: (e) => (e instanceof Error ? e.message : "Something went wrong"),
          }),
          runIdFetch,
        );
      },
    },
  },
});
