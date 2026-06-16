-- ============================================================
-- Migration 005: Policy SELECT pubblica su profiles
-- Permette a qualsiasi utente autenticato di leggere
-- i profili altrui (nome, bio, avatar) — necessario per
-- visualizzare atleti nelle richieste e trainer nella ricerca.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ogni utente autenticato può leggere tutti i profili
DROP POLICY IF EXISTS "authenticated users can read profiles" ON profiles;
CREATE POLICY "authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Ogni utente può modificare solo il proprio profilo
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
