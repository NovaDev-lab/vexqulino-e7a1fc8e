import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Claude, Gemini & ChatGPT side by side" },
      { name: "description", content: "Sign in or create an account to chat with three AIs at once." },
      { property: "og:title", content: "Sign in to compare 3 AIs" },
      { property: "og:description", content: "Create a free account: 100 prompts a day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setErr(error.message);
      else setMsg("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else void navigate({ to: "/" });
    }
    setBusy(false);
  };

  const google = async () => {
    setErr(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return setErr(r.error.message ?? "Google sign-in failed");
    if (r.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <div className="neon-bg flex min-h-dvh items-center justify-center px-4 text-foreground">
      <div className="composer w-full max-w-sm rounded-2xl p-6">
        <h1 className="font-display text-center text-lg tracking-[0.2em] neon-text">{mode === "in" ? "SIGN IN" : "SIGN UP"}</h1>
        <button onClick={google} className="mt-6 w-full rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-muted/40">
          Continue with Google
        </button>
        <div className="my-4 text-center font-mono text-[10px] text-muted-foreground">OR</div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground neon-glow disabled:opacity-60">
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        {msg && <p className="mt-3 text-xs text-primary">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
          {mode === "in" ? "No account? Sign up free" : "Have an account? Sign in"}
        </button>
        <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Back to chat</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </div>
    </div>
  );
}
