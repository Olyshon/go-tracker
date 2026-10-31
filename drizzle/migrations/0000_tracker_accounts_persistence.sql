CREATE TABLE public.tracker_versions (user_id uuid PRIMARY KEY, revision bigint NOT NULL DEFAULT 0);
GRANT SELECT, INSERT, UPDATE ON public.tracker_versions TO authenticated;
GRANT ALL ON public.tracker_versions TO service_role;
ALTER TABLE public.tracker_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_version ON public.tracker_versions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.habits (id text NOT NULL, user_id uuid NOT NULL, PRIMARY KEY(user_id,id));
GRANT SELECT, INSERT, UPDATE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_habits ON public.habits FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.habit_revisions (user_id uuid NOT NULL, habit_id text NOT NULL, effective_from date NOT NULL CHECK (extract(day from effective_from)=1), title text NOT NULL, emoji text NOT NULL, frequency jsonb NOT NULL DEFAULT '{"type":"daily"}' CHECK (frequency->>'type' IN ('daily','weekly','monthly') AND (frequency->>'type'='daily' OR (frequency->>'times')::numeric >= 1)), start_date date, end_date date, ended boolean NOT NULL DEFAULT false, PRIMARY KEY(user_id,habit_id,effective_from), FOREIGN KEY(user_id,habit_id) REFERENCES public.habits(user_id,id), CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date));
GRANT SELECT, INSERT, UPDATE ON public.habit_revisions TO authenticated;
GRANT ALL ON public.habit_revisions TO service_role;
ALTER TABLE public.habit_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_revisions ON public.habit_revisions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.habit_completions (user_id uuid NOT NULL, habit_id text NOT NULL, completed_on date NOT NULL, PRIMARY KEY(user_id,habit_id,completed_on), FOREIGN KEY(user_id,habit_id) REFERENCES public.habits(user_id,id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_completions TO authenticated;
GRANT ALL ON public.habit_completions TO service_role;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_completions ON public.habit_completions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.monthly_goals (user_id uuid NOT NULL, id text NOT NULL, month date NOT NULL CHECK (extract(day from month)=1), title text NOT NULL, done boolean NOT NULL DEFAULT false, position integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,month,id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_goals TO authenticated;
GRANT ALL ON public.monthly_goals TO service_role;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_goals ON public.monthly_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.read_tracker() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
SELECT jsonb_build_object('revision',coalesce((SELECT revision FROM tracker_versions WHERE user_id=auth.uid()),0), 'habits',coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM habits h WHERE user_id=auth.uid()),'[]'::jsonb), 'revisions',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY effective_from) FROM habit_revisions r WHERE user_id=auth.uid()),'[]'::jsonb), 'completions',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY completed_on) FROM habit_completions c WHERE user_id=auth.uid()),'[]'::jsonb), 'goals',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY position) FROM monthly_goals g WHERE user_id=auth.uid()),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.read_tracker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_tracker() TO authenticated;
CREATE FUNCTION public.save_tracker(expected_revision bigint, payload jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE owner_id uuid := auth.uid(); current_revision bigint; h record; r jsonb; m record; g jsonb; c record; day_value jsonb; p integer;
BEGIN
IF owner_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
INSERT INTO tracker_versions(user_id) VALUES(owner_id) ON CONFLICT DO NOTHING;
SELECT revision INTO current_revision FROM tracker_versions WHERE user_id=owner_id FOR UPDATE;
IF current_revision <> expected_revision THEN RAISE EXCEPTION 'TRACKER_CONFLICT'; END IF;
FOR h IN SELECT * FROM jsonb_each(payload->'habits') LOOP
INSERT INTO habits(user_id,id) VALUES(owner_id,h.key) ON CONFLICT DO NOTHING;
FOR r IN SELECT * FROM jsonb_array_elements(h.value) LOOP
IF r->'habit'->>'id' <> h.key THEN RAISE EXCEPTION 'Invalid habit'; END IF;
INSERT INTO habit_revisions(user_id,habit_id,effective_from,title,emoji,frequency,start_date,end_date,ended)
VALUES(owner_id,h.key,(r->>'from')::date,r->'habit'->>'title',r->'habit'->>'emoji',coalesce(r->'habit'->'freq','{"type":"daily"}'::jsonb),(r->'habit'->>'startDate')::date,(r->'habit'->>'endDate')::date,coalesce((r->>'ended')::boolean,false))
ON CONFLICT(user_id,habit_id,effective_from) DO UPDATE SET title=excluded.title,emoji=excluded.emoji,frequency=excluded.frequency,start_date=excluded.start_date,end_date=excluded.end_date,ended=excluded.ended;
END LOOP;
END LOOP;
DELETE FROM habit_completions WHERE user_id=owner_id;
DELETE FROM monthly_goals WHERE user_id=owner_id;
FOR m IN SELECT * FROM jsonb_each(payload->'months') LOOP
p := 0;
FOR g IN SELECT * FROM jsonb_array_elements(m.value->'goals') LOOP
INSERT INTO monthly_goals(user_id,id,month,title,done,position) VALUES(owner_id,g->>'id',(m.key||'-01')::date,g->>'title',(g->>'done')::boolean,p);
p := p+1;
END LOOP;
FOR c IN SELECT * FROM jsonb_each(m.value->'checks') LOOP
FOR day_value IN SELECT * FROM jsonb_array_elements(c.value) LOOP
INSERT INTO habit_completions(user_id,habit_id,completed_on) VALUES(owner_id,c.key,(m.key||'-'||lpad(day_value::text,2,'0'))::date) ON CONFLICT DO NOTHING;
END LOOP;
END LOOP;
END LOOP;
UPDATE tracker_versions SET revision=revision+1 WHERE user_id=owner_id RETURNING revision INTO current_revision;
RETURN current_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.save_tracker(bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_tracker(bigint,jsonb) TO authenticated;