CREATE OR REPLACE FUNCTION public.save_tracker(expected_revision bigint, payload jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE owner_id uuid := auth.uid(); current_revision bigint; h record; r jsonb; m record; g jsonb; c record; day_value jsonb; p integer;
BEGIN
IF owner_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
IF payload->>'userId' IS DISTINCT FROM owner_id::text THEN RAISE EXCEPTION 'TRACKER_ACCOUNT_CHANGED'; END IF;
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