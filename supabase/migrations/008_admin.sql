-- ============================================================
-- Migration 008: Admin role
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- RPC: metriche aggregate
CREATE OR REPLACE FUNCTION get_admin_metrics()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT is_admin FROM profiles WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN json_build_object(
    'total_users',       (SELECT COUNT(*) FROM profiles),
    'trainers',          (SELECT COUNT(*) FROM profiles WHERE role = 'trainer'),
    'athletes',          (SELECT COUNT(*) FROM profiles WHERE role = 'athlete'),
    'active_pairs',      (SELECT COUNT(*) FROM trainer_athlete),
    'total_plans',       (SELECT COUNT(*) FROM workout_plans),
    'pending_requests',  (SELECT COUNT(*) FROM trainer_athlete_requests WHERE status = 'pending')
  );
END;
$$;

-- RPC: elimina utente (profile + auth user)
CREATE OR REPLACE FUNCTION admin_delete_user(p_profile_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  IF NOT (SELECT is_admin FROM profiles WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT auth_user_id INTO v_auth_id FROM profiles WHERE id = p_profile_id;
  DELETE FROM profiles WHERE id = p_profile_id;
  DELETE FROM auth.users WHERE id = v_auth_id;
END;
$$;
