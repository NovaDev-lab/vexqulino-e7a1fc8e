import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square, Paperclip, X, Brain, Telescope, Swords, ImageIcon, MessageSquare, History, Plus, Trash2, FileText } from "lucide-react";
import { streamImage } from "@/lib/ai/stream-image";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Claude, Gemini & ChatGPT — side by side & debate" },
      { name: "description", content: "Send one prompt to Claude, Gemini and ChatGPT at once: attach files, think harder, deep research, generate images and keep chat history." },
      { property: "og:title", content: "Compare & debate 3 AIs" },
      { property: "og:description", content: "One prompt, three AIs, three live answers — with files, deep research and images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PANELS = [
  { id: "claude", name: "Claude", model: "Opus 5.5", images: false },
  { id: "gemini", name: "Gemini", model: "3.8 Flash", images: true },
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", images: true },
] as const;
type ProviderId = (typeof PANELS)[number]["id"];
type Mode = "chat" | "think" | "research" | "image" | "debate";
type Convo = { id: string; title: string; updatedAt: number; chats: Record<ProviderId, UIMessage[]> };

const MODES: { id: Mode; label: string; icon: typeof Brain }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "think", label: "Think harder", icon: Brain },
  { id: "research", label: "Deep research", icon: Telescope },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "debate", label: "Debate", icon: Swords },
];
const DEBATE_ROUNDS = 2;
const lastAnswers: Record<string, string> = {};

const STORE = "neon-triad-history";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const loadConvos = (): Convo[] => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]") as Convo[];
  } catch {
    return [];
  }
};
const saveConvos = (list: Convo[]) => {
  let l = list;
  while (l.length) {
    try {
      localStorage.setItem(STORE, JSON.stringify(l));
      return;
    } catch {
      l = l.slice(0, -1); // storage full: drop the oldest chats
    }
  }
};

function usePanel(provider: string) {
  return useChat({
    id: provider,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { provider } }),
    onFinish: ({ message }) => {
      lastAnswers[provider] = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    },
  });
}
type Chat = ReturnType<typeof usePanel>;

function Panel({ name, model, chat, imageBusy }: { name: string; model: string; chat: Chat; imageBusy: boolean }) {
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
                {m.parts.map((p, i) => {
                  if (p.type === "text")
                    return m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                    ) : (
                      <div key={i} className="neon-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                      </div>
                    );
                  if (p.type === "reasoning" && p.text.trim())
                    return (
                      <details key={i} className="mb-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-mono">Thinking</summary>
                        <p className="mt-1 whitespace-pre-wrap">{p.text}</p>
                      </details>
                    );
                  if (p.type === "file")
                    return p.mediaType.startsWith("image/") ? (
                      <img key={i} src={p.url} alt={p.filename ?? "image"} className={`my-1 max-h-80 rounded-lg ${m.role === "user" ? "max-w-[160px]" : "w-full object-contain"}`} />
                    ) : (
                      <span key={i} className="my-1 flex items-center gap-1 font-mono text-xs"><FileText className="h-3 w-3" />{p.filename ?? "file"}</span>
                    );
                  return null;
                })}
              </div>
            </div>
          ))}
          {(chat.status === "submitted" || imageBusy) && (
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
  const [mode, setMode] = useState<Mode>("chat");
  const [files, setFiles] = useState<File[]>([]);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [currentId, setCurrentId] = useState(uid);
  const [showHistory, setShowHistory] = useState(false);
  const [imageBusy, setImageBusy] = useState<Record<string, boolean>>({});
  const imageAbort = useRef<AbortController | null>(null);
  const debateStop = useRef(false);
  const [debating, setDebating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const claude = usePanel("claude");
  const gemini = usePanel("gemini");
  const chatgpt = usePanel("chatgpt");
  const chats: Record<ProviderId, Chat> = { claude, gemini, chatgpt };
  const list = [claude, gemini, chatgpt];
  const anyImageBusy = Object.values(imageBusy).some(Boolean);
  const busy = debating || anyImageBusy || list.some((c) => c.status === "submitted" || c.status === "streaming");

  useEffect(() => setConvos(loadConvos()), []);

  // Save the current conversation whenever all three finish.
  useEffect(() => {
    if (busy) return;
    const total = list.reduce((n, c) => n + c.messages.length, 0);
    if (!total) return;
    const firstUser = list.flatMap((c) => c.messages).find((m) => m.role === "user");
    const firstText = firstUser?.parts.find((p) => p.type === "text");
    const title = (firstText && "text" in firstText ? firstText.text : "New chat").slice(0, 60);
    setConvos((prev) => {
      const next = [
        { id: currentId, title, updatedAt: Date.now(), chats: { claude: claude.messages, gemini: gemini.messages, chatgpt: chatgpt.messages } },
        ...prev.filter((c) => c.id !== currentId),
      ];
      saveConvos(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, claude.messages, gemini.messages, chatgpt.messages, currentId]);

  const openConvo = (c: Convo) => {
    if (busy) return;
    setCurrentId(c.id);
    PANELS.forEach((p) => chats[p.id].setMessages(c.chats[p.id] ?? []));
    setShowHistory(false);
  };
  const newChat = () => {
    if (busy) return;
    setCurrentId(uid());
    list.forEach((c) => c.setMessages([]));
    setShowHistory(false);
  };
  const deleteConvo = (id: string) => {
    setConvos((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConvos(next);
      return next;
    });
    if (id === currentId) newChat();
  };

  const runImage = async (id: ProviderId, prompt: string, signal: AbortSignal) => {
    const chat = chats[id];
    const userMsg: UIMessage = { id: uid(), role: "user", parts: [{ type: "text", text: `🎨 ${prompt}` }] };
    const asstId = uid();
    chat.setMessages((m) => [...m, userMsg]);
    setImageBusy((b) => ({ ...b, [id]: true }));
    const show = (parts: UIMessage["parts"]) =>
      chat.setMessages((m) => [...m.filter((x) => x.id !== asstId), { id: asstId, role: "assistant", parts }]);
    try {
      await streamImage("/api/image", { prompt, provider: id }, (url) => show([{ type: "file", mediaType: "image/png", url }]), signal);
    } catch (e) {
      if (!signal.aborted) show([{ type: "text", text: `⚠️ ${e instanceof Error ? e.message : "Image generation failed"}` }]);
    } finally {
      setImageBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const submit = async () => {
    const text = input.trim();
    if (busy || (!text && !files.length)) return;
    setInput("");
    if (mode === "debate") {
      if (!text) return;
      void runDebate(text);
      return;
    }
    if (mode === "image") {
      if (!text) return;
      const ctrl = new AbortController();
      imageAbort.current = ctrl;
      claude.setMessages((m) => [
        ...m,
        { id: uid(), role: "user", parts: [{ type: "text", text: `🎨 ${text}` }] },
        { id: uid(), role: "assistant", parts: [{ type: "text", text: "_Claude can't create images — see Gemini and ChatGPT._" }] },
      ]);
      void runImage("gemini", text, ctrl.signal);
      void runImage("chatgpt", text, ctrl.signal);
      return;
    }
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    setFiles([]);
    list.forEach((c) => c.sendMessage({ text: text || "Please look at the attached file.", files: dt.files }, { body: { mode } }));
  };

  const runDebate = async (topic: string) => {
    debateStop.current = false;
    setDebating(true);
    const transcript: string[] = [];
    try {
      for (let round = 1; round <= DEBATE_ROUNDS; round++) {
        for (const p of PANELS) {
          if (debateStop.current) return;
          const others = PANELS.filter((o) => o.id !== p.id).map((o) => o.name).join(" and ");
          const stage =
            round === 1 && transcript.length === 0
              ? "Give your opening statement and take a clear position."
              : round === DEBATE_ROUNDS
                ? "This is the final round: rebut the strongest points made so far and give your closing argument."
                : "Respond to the previous speakers: challenge their weakest points and strengthen your position.";
          const prompt = `⚔️ Debate topic: "${topic}"\nYou are ${p.name}, debating ${others}. Round ${round} of ${DEBATE_ROUNDS}.\n\n${
            transcript.length ? `Debate so far:\n${transcript.join("\n\n")}\n\n` : ""
          }${stage}`;
          lastAnswers[p.id] = "";
          await chats[p.id].sendMessage({ text: prompt }, { body: { mode: "debate" } });
          if (debateStop.current) return;
          transcript.push(`${p.name} (round ${round}): ${lastAnswers[p.id] || "(no answer)"}`);
        }
      }
    } finally {
      setDebating(false);
    }
  };

  const stopAll = () => {
    debateStop.current = true;
    list.forEach((c) => c.stop());
    imageAbort.current?.abort();
  };

  return (
    <div className="neon-bg flex h-dvh flex-col text-foreground">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="ml-auto flex gap-2">
          <button onClick={newChat} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs disabled:opacity-50" aria-label="New chat">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New</span>
          </button>
          <button onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs" aria-label="History">
            <History className="h-3.5 w-3.5" /> <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {showHistory && (
          <aside className="composer absolute inset-y-0 right-0 z-20 m-3 flex w-72 max-w-[85vw] flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="font-display text-xs tracking-[0.2em] neon-text">HISTORY</span>
              <button onClick={() => setShowHistory(false)} aria-label="Close history"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {convos.length === 0 && <p className="p-4 text-center font-mono text-xs text-muted-foreground">No saved chats yet</p>}
              {convos.map((c) => (
                <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm hover:bg-muted/40 ${c.id === currentId ? "bg-muted/40" : ""}`}>
                  <button onClick={() => openConvo(c)} className="flex-1 truncate text-left">
                    {c.title}
                    <span className="block font-mono text-[10px] text-muted-foreground">{new Date(c.updatedAt).toLocaleString()}</span>
                  </button>
                  <button onClick={() => deleteConvo(c.id)} aria-label="Delete chat" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </aside>
        )}
        <main className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-3 lg:overflow-hidden">
          {PANELS.map((p) => (
            <Panel key={p.id} name={p.name} model={p.model} chat={chats[p.id]} imageBusy={!!imageBusy[p.id]} />
          ))}
        </main>
      </div>

      <footer className="px-3 pb-3">
        <div className="mx-auto mb-2 flex max-w-4xl flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${mode === m.id ? "border-primary bg-primary/15 text-primary neon-glow" : "border-border text-muted-foreground"}`}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>
        <div className="composer mx-auto max-w-4xl rounded-2xl p-2">
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 px-1">
              {files.map((f, i) => (
                <span key={i} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[11px]">
                  {f.name}
                  <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                setFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={mode === "image"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground disabled:opacity-40"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={mode === "image" ? "Describe an image for Gemini & ChatGPT…" : mode === "debate" ? "Give a debate topic — the AIs will argue it out…" : mode === "research" ? "What should all three research?" : "Ask all three AIs at once…"}
              rows={1}
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={busy ? stopAll : () => void submit()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground neon-glow"
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
