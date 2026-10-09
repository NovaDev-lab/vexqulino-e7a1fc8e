import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://ai.gateway.lovable.dev";
const MODELS: Record<string, { model: string; format: "openai" | "gemini-chat" }> = {
  gemini: { model: "google/gemini-3.1-flash-image", format: "gemini-chat" },
  chatgpt: { model: "openai/gpt-image-2.5-sunburst", format: "openai" },
};

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });
        const { prompt, provider, stream } = (await request.json()) as {
          prompt?: string;
          provider?: string;
          stream?: boolean;
        };
        const cfg = provider ? MODELS[provider] : undefined;
        if (!cfg) return new Response("Image generation isn't available for this AI", { status: 400 });
        if (!prompt?.trim()) return new Response("Prompt is required", { status: 400 });

        const input =
          cfg.format === "openai"
            ? { prompt, ...(stream !== false ? { partial_images: 1 } : {}) }
            : { messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] };
        try {
          const res = await fetch(`${BASE}/v1/images/generations`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: cfg.model, ...input, ...(stream !== false ? { stream: true } : {}) }),
            signal: request.signal,
          });
          const headers = new Headers({ "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-cache, no-transform" });
          res.headers.forEach((v, k) => {
            if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v);
          });
          return new Response(res.body, { status: res.status, headers });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
