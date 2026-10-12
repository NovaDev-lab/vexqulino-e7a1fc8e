import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Claude, Gemini & ChatGPT side by side" },
      { name: "description", content: "Free: 100 prompts a day. Pro ₹50/month: 1,000 a day. Ultimate ₹100/month: unlimited." },
      { property: "og:title", content: "Plans & daily prompt limits" },
      { property: "og:description", content: "Free, Pro and Ultimate plans in INR, monthly or yearly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const FEATURES = ["Claude, Gemini & ChatGPT at once", "Think harder & deep research", "Image generation", "AI debates"];

function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { user, usage } = useAuth();
  const current = user ? (usage?.plan ?? "free") : null;

  return (
    <div className="neon-bg min-h-dvh px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to chat</Link>
          {!user && <Link to="/auth" className="hover:text-foreground">Sign in</Link>}
        </div>
        <h1 className="font-display mt-6 text-center text-2xl tracking-[0.2em] neon-text">PRICING</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">One prompt = one question sent to all three AIs. Limits reset daily.</p>
        <div className="mt-6 flex justify-center gap-1">
          {(["Monthly", "Yearly"] as const).map((l) => (
            <button key={l} onClick={() => setYearly(l === "Yearly")} className={`rounded-full border px-4 py-1 text-xs ${yearly === (l === "Yearly") ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
              {l}{l === "Yearly" && " · 2 months free"}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const price = yearly ? p.yearly : p.monthly;
            const isCurrent = current === p.id;
            return (
              <div key={p.id} className={`composer flex flex-col rounded-2xl p-6 ${p.id === "pro" ? "neon-glow" : ""}`}>
                <h2 className="font-display text-sm tracking-[0.2em]">{p.name.toUpperCase()}</h2>
                <p className="mt-4 text-3xl font-semibold">₹{price}<span className="text-sm text-muted-foreground">{price ? (yearly ? "/year" : "/month") : ""}</span></p>
                <p className="mt-2 text-sm text-primary">{p.limit}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {FEATURES.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>)}
                </ul>
                {isCurrent ? (
                  <div className="mt-6 rounded-xl border border-primary px-4 py-2 text-center text-sm text-primary">Current plan</div>
                ) : p.id === "free" ? (
                  <Link to={user ? "/" : "/auth"} className="mt-6 rounded-xl border border-border px-4 py-2 text-center text-sm hover:bg-muted/40">{user ? "Start chatting" : "Sign up free"}</Link>
                ) : (
                  <button disabled className="mt-6 rounded-xl bg-primary/40 px-4 py-2 text-sm text-primary-foreground opacity-70">Coming soon</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
