-- ============================================================
-- Migration 009: Ban utenti
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- RPC: ban/unban utente
CREATE OR REPLACE FUNCTION admin_set_ban(p_profile_id uuid, p_banned boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT is_admin FROM profiles WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles SET is_banned = p_banned WHERE id = p_profile_id;
END;
$$;
