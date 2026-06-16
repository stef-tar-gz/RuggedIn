-- ============================================================
-- Migration 004: Fix rimozione atleta lato trainer
-- ============================================================

-- 1. Sostituisce il constraint UNIQUE(athlete_id, trainer_id) con un
--    partial unique index solo sulle richieste 'pending'.
--    Così un atleta può reinviare una richiesta allo stesso trainer
--    dopo che la precedente è stata accettata/rifiutata/rimossa.
ALTER TABLE trainer_athlete_requests
  DROP CONSTRAINT IF EXISTS unique_pending_request;

CREATE UNIQUE INDEX unique_pending_request
  ON trainer_athlete_requests (athlete_id, trainer_id)
  WHERE status = 'pending';

-- 2. Policy DELETE su trainer_athlete per il trainer
--    (permette al trainer di rimuovere un proprio atleta)
ALTER TABLE trainer_athlete ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer can remove athlete" ON trainer_athlete;
CREATE POLICY "trainer can remove athlete"
  ON trainer_athlete FOR DELETE
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Assicuriamo che il trainer possa anche leggere i propri atleti
DROP POLICY IF EXISTS "trainer can view own athletes" ON trainer_athlete;
CREATE POLICY "trainer can view own athletes"
  ON trainer_athlete FOR SELECT
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- E che l'atleta possa leggere la propria relazione (per il profilo)
DROP POLICY IF EXISTS "athlete can view own relation" ON trainer_athlete;
CREATE POLICY "athlete can view own relation"
  ON trainer_athlete FOR SELECT
  USING (athlete_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
