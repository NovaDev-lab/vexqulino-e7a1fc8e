CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TABLE public.prompt_log (
  user_id uuid NOT NULL,
  prompt_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, prompt_id)
);
GRANT SELECT ON public.prompt_log TO authenticated;
GRANT ALL ON public.prompt_log TO service_role;
ALTER TABLE public.prompt_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own log read" ON public.prompt_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.plan_limit(p_plan text, p_email text) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(coalesce(p_email,'')) = 'akansh.singh.2014@gmail.com' THEN NULL
    WHEN p_plan = 'ultimate' THEN NULL
    WHEN p_plan = 'pro' THEN 1000
    ELSE 100 END
$$;

-- Usage for the current user: today's count and limit (NULL = unlimited)
CREATE OR REPLACE FUNCTION public.my_usage() RETURNS TABLE(used integer, daily_limit integer, plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::int FROM public.prompt_log l WHERE l.user_id = auth.uid() AND l.created_at >= date_trunc('day', now())),
    public.plan_limit(p.plan, u.email),
    p.plan
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid()
$$;

-- Counts a prompt once (same prompt_id reused across the 3 AIs / debate turns). Returns false when over limit.
CREATE OR REPLACE FUNCTION public.consume_prompt(p_prompt_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_used int; v_limit int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.prompt_log WHERE user_id = auth.uid() AND prompt_id = p_prompt_id) THEN RETURN true; END IF;
  SELECT used, daily_limit INTO v_used, v_limit FROM public.my_usage();
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN RETURN false; END IF;
  INSERT INTO public.prompt_log (user_id, prompt_id) VALUES (auth.uid(), p_prompt_id) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.my_usage() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.consume_prompt(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_prompt(text) TO authenticated;