import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Verifies the caller's sign-in and counts one prompt against their daily plan limit. Returns an error Response, or null when allowed. */
export async function checkQuota(request: Request, promptId: unknown): Promise<Response | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!url || !key) return new Response("Sign-in is not configured", { status: 500 });
  if (!token || token.split(".").length !== 3) return new Response("Please sign in to chat.", { status: 401 });
  if (typeof promptId !== "string" || !promptId || promptId.length > 100)
    return new Response("Missing prompt id", { status: 400 });

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return new Response("Please sign in to chat.", { status: 401 });

  const { data, error } = await supabase.rpc("consume_prompt", { p_prompt_id: promptId });
  if (error) return new Response("Couldn't check your plan. Try again.", { status: 500 });
  if (!data) return new Response("You've used all your prompts for today. Upgrade your plan on the Pricing page or come back tomorrow.", { status: 429 });
  return null;
}
