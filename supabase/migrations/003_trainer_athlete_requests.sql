-- ============================================================
-- Migration 003: Trainer-Athlete request flow + 1:1 constraint
-- ============================================================

-- 1. UNIQUE constraint su trainer_athlete.athlete_id (relazione 1:1)
--    Un atleta può avere al massimo un trainer.
ALTER TABLE trainer_athlete
  ADD CONSTRAINT trainer_athlete_athlete_unique UNIQUE (athlete_id);

-- 2. Nuova tabella: richieste di associazione atleta → trainer
CREATE TABLE trainer_athlete_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Un atleta non può avere più richieste pending verso lo stesso trainer
  CONSTRAINT unique_pending_request UNIQUE (athlete_id, trainer_id)
);

-- Index per query frequenti
CREATE INDEX idx_tar_trainer_status ON trainer_athlete_requests (trainer_id, status);
CREATE INDEX idx_tar_athlete        ON trainer_athlete_requests (athlete_id);

-- 3. RLS
ALTER TABLE trainer_athlete_requests ENABLE ROW LEVEL SECURITY;

-- L'atleta può vedere le proprie richieste
CREATE POLICY "athlete can view own requests"
  ON trainer_athlete_requests FOR SELECT
  USING (athlete_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- L'atleta può creare richieste (solo come se stesso)
CREATE POLICY "athlete can insert own requests"
  ON trainer_athlete_requests FOR INSERT
  WITH CHECK (athlete_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- L'atleta può cancellare le proprie richieste pending (revoca)
CREATE POLICY "athlete can delete own pending requests"
  ON trainer_athlete_requests FOR DELETE
  USING (
    athlete_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND status = 'pending'
  );

-- Il trainer può vedere le richieste a lui indirizzate
CREATE POLICY "trainer can view own requests"
  ON trainer_athlete_requests FOR SELECT
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Il trainer può aggiornare lo status (accetta/rifiuta)
CREATE POLICY "trainer can update request status"
  ON trainer_athlete_requests FOR UPDATE
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (status IN ('accepted', 'rejected'));

-- 4. Funzione: accetta richiesta
--    - Imposta status = 'accepted'
--    - Inserisce in trainer_athlete (gestisce il cambio trainer:
--      elimina prima la relazione esistente e le schede del vecchio trainer)
CREATE OR REPLACE FUNCTION accept_trainer_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete_id uuid;
  v_trainer_id uuid;
  v_old_trainer_id uuid;
BEGIN
  -- Recupera i dati della richiesta (solo il trainer chiamante può accettarla)
  SELECT athlete_id, trainer_id
  INTO v_athlete_id, v_trainer_id
  FROM trainer_athlete_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not authorized';
  END IF;

  -- Controlla se l'atleta ha già un trainer
  SELECT trainer_id INTO v_old_trainer_id
  FROM trainer_athlete
  WHERE athlete_id = v_athlete_id;

  IF v_old_trainer_id IS NOT NULL THEN
    -- Rimuove le schede del vecchio trainer
    DELETE FROM workout_plans
    WHERE athlete_id = v_athlete_id
      AND trainer_id = v_old_trainer_id;

    -- Rimuove la relazione vecchia
    DELETE FROM trainer_athlete
    WHERE athlete_id = v_athlete_id;
  END IF;

  -- Crea la nuova relazione
  INSERT INTO trainer_athlete (trainer_id, athlete_id)
  VALUES (v_trainer_id, v_athlete_id);

  -- Aggiorna status richiesta
  UPDATE trainer_athlete_requests
  SET status = 'accepted'
  WHERE id = p_request_id;

  -- Rifiuta automaticamente tutte le altre richieste pending dell'atleta
  UPDATE trainer_athlete_requests
  SET status = 'rejected'
  WHERE athlete_id = v_athlete_id
    AND id <> p_request_id
    AND status = 'pending';
END;
$$;

-- 5. Funzione: lista trainer pubblici (per la schermata find-trainer)
CREATE OR REPLACE FUNCTION get_public_trainers(p_search text DEFAULT '')
RETURNS TABLE (
  id          uuid,
  full_name   text,
  bio         text,
  avatar_url  text,
  athlete_count int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.avatar_url,
    COUNT(ta.athlete_id)::int AS athlete_count
  FROM profiles p
  LEFT JOIN trainer_athlete ta ON ta.trainer_id = p.id
  WHERE p.role = 'trainer'
    AND (p.full_name ILIKE '%' || p_search || '%' OR p_search = '')
  GROUP BY p.id, p.full_name, p.bio, p.avatar_url
  ORDER BY p.full_name;
$$;
