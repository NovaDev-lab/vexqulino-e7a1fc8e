import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square, Paperclip, Brain, X, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEON — Claude Chat" },
      { name: "description", content: "A futuristic neon chat powered by Claude, with thinking, image and file understanding." },
      { property: "og:title", content: "NEON — Claude Chat" },
      { property: "og:description", content: "A futuristic neon chat powered by Claude." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MODELS = [
  { id: "claude-sonnet-4-5", label: "Sonnet" },
  { id: "claude-opus-4-1", label: "Opus" },
  { id: "claude-haiku-4-5", label: "Haiku" },
];

function Index() {
  const [model, setModel] = useState("claude-sonnet-4-5");
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const submit = () => {
    if (busy || (!input.trim() && !files)) return;
    sendMessage(files ? { text: input, files } : { text: input }, { body: { model, thinking } });
    setInput("");
    setFiles(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="neon-bg flex h-dvh flex-col text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="neon-orb grid h-8 w-8 place-items-center rounded-lg">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg tracking-[0.3em] neon-text">NEON</span>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card/60 p-1">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-mono transition ${
                model === m.id ? "bg-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.length === 0 && (
            <div className="mt-24 text-center">
              <h1 className="font-display text-4xl tracking-widest neon-text sm:text-5xl">ASK ANYTHING</h1>
              <p className="mt-3 font-mono text-sm text-muted-foreground">Code · Writing · Analysis · Images · Documents</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={m.role === "user" ? "user-bubble max-w-[85%] rounded-2xl px-4 py-2.5" : "w-full"}>
                {m.parts.map((p, i) => {
                  if (p.type === "text")
                    return m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                    ) : (
                      <div key={i} className="neon-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                      </div>
                    );
                  if (p.type === "reasoning" && p.text)
                    return (
                      <details key={i} className="mb-2 rounded-lg border border-accent/40 bg-card/50 px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-mono text-xs text-accent">◆ thinking</summary>
                        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{p.text}</p>
                      </details>
                    );
                  if (p.type === "file")
                    return p.mediaType.startsWith("image/") ? (
                      <img key={i} src={p.url} alt={p.filename ?? ""} className="mb-2 max-h-48 rounded-lg" />
                    ) : (
                      <div key={i} className="mb-2 font-mono text-xs">📎 {p.filename}</div>
                    );
                  return null;
                })}
              </div>
            </div>
          ))}
          {status === "submitted" && (
            <div className="flex gap-1.5">
              <span className="neon-dot" /><span className="neon-dot [animation-delay:150ms]" /><span className="neon-dot [animation-delay:300ms]" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="px-4 pb-4">
        <div className="composer mx-auto max-w-3xl rounded-2xl p-2">
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pt-1">
              {Array.from(files).map((f) => (
                <span key={f.name} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{f.name}</span>
              ))}
              <button onClick={() => { setFiles(null); if (fileRef.current) fileRef.current.value = ""; }}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Transmit a message…"
            rows={1}
            className="max-h-40 w-full resize-none bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => setFiles(e.target.files)} />
              <button onClick={() => fileRef.current?.click()} className="rounded-lg p-2 text-muted-foreground hover:text-primary" aria-label="Attach">
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => setThinking((t) => !t)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs ${thinking ? "text-accent neon-glow-accent" : "text-muted-foreground"}`}
              >
                <Brain className="h-4 w-4" /> Think
              </button>
            </div>
            <button
              onClick={busy ? stop : submit}
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground neon-glow"
              aria-label={busy ? "Stop" : "Send"}
            >
              {busy ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
