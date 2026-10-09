import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEON Triad — Claude, Gemini & ChatGPT side by side" },
      { name: "description", content: "Send one prompt to Claude, Gemini and ChatGPT at once and compare their streaming answers." },
      { property: "og:title", content: "NEON Triad — Compare 3 AIs" },
      { property: "og:description", content: "One prompt, three AIs, three live answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PANELS = [
  { id: "claude", name: "Claude", model: "Opus 5.5" },
  { id: "gemini", name: "Gemini", model: "3.8 Flash" },
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra" },
] as const;

function usePanel(provider: string) {
  return useChat({ id: provider, transport: new DefaultChatTransport({ api: "/api/chat", body: { provider } }) });
}

function Panel({ name, model, chat }: { name: string; model: string; chat: ReturnType<typeof usePanel> }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.status]);

  return (
    <section className="composer flex min-h-[60dvh] flex-col overflow-hidden rounded-2xl lg:min-h-0">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="font-display text-sm tracking-[0.2em] neon-text">{name.toUpperCase()}</span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{model}</span>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {chat.messages.length === 0 && (
            <p className="mt-10 text-center font-mono text-xs text-muted-foreground">Waiting for a prompt…</p>
          )}
          {chat.messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={m.role === "user" ? "user-bubble max-w-[90%] rounded-2xl px-3 py-2 text-sm" : "w-full text-sm"}>
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                    ) : (
                      <div key={i} className="neon-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                      </div>
                    )
                  ) : null,
                )}
              </div>
            </div>
          ))}
          {chat.status === "submitted" && (
            <div className="flex gap-1.5">
              <span className="neon-dot" /><span className="neon-dot [animation-delay:150ms]" /><span className="neon-dot [animation-delay:300ms]" />
            </div>
          )}
          {chat.error && (
            <div className="rounded-lg border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {chat.error.message}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </section>
  );
}

function Index() {
  const [input, setInput] = useState("");
  const claude = usePanel("claude");
  const gemini = usePanel("gemini");
  const chatgpt = usePanel("chatgpt");
  const chats = [claude, gemini, chatgpt];
  const busy = chats.some((c) => c.status === "submitted" || c.status === "streaming");

  const submit = () => {
    const text = input.trim();
    if (busy || !text) return;
    chats.forEach((c) => c.sendMessage({ text }));
    setInput("");
  };

  return (
    <div className="neon-bg flex h-dvh flex-col text-foreground">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="neon-orb h-6 w-6 rounded-md" />
        <span className="font-display text-lg tracking-[0.3em] neon-text">NEON TRIAD</span>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-3 lg:overflow-hidden">
        {PANELS.map((p, i) => (
          <Panel key={p.id} name={p.name} model={p.model} chat={chats[i]} />
        ))}
      </main>

      <footer className="px-3 pb-3">
        <div className="composer mx-auto flex max-w-4xl items-end gap-2 rounded-2xl p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask all three AIs at once…"
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={busy ? () => chats.forEach((c) => c.stop()) : submit}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground neon-glow"
            aria-label={busy ? "Stop" : "Send"}
          >
            {busy ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
