-- ============================================================
-- Migration 006: Catalogo esercizi
-- ============================================================

CREATE TABLE exercise_catalog (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  muscle_group text NOT NULL,
  equipment    text NOT NULL DEFAULT 'corpo libero',
  difficulty   text NOT NULL DEFAULT 'intermedio'
                 CHECK (difficulty IN ('principiante', 'intermedio', 'avanzato')),
  description  text,
  video_url    text,
  -- NULL = esercizio globale (pre-seeded); uuid = custom del trainer
  trainer_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ec_muscle    ON exercise_catalog (muscle_group);
CREATE INDEX idx_ec_trainer   ON exercise_catalog (trainer_id);
CREATE INDEX idx_ec_name      ON exercise_catalog USING gin(to_tsvector('italian', name));

-- Aggiunge colonna catalog_exercise_id alla tabella exercises esistente
-- (nullable per retrocompatibilità con esercizi già inseriti)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS catalog_exercise_id uuid REFERENCES exercise_catalog(id) ON DELETE SET NULL;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE exercise_catalog ENABLE ROW LEVEL SECURITY;

-- Esercizi globali: visibili a tutti gli utenti autenticati
CREATE POLICY "global exercises readable by all"
  ON exercise_catalog FOR SELECT
  TO authenticated
  USING (trainer_id IS NULL);

-- Esercizi custom: visibili al trainer che li ha creati
CREATE POLICY "trainer can read own custom exercises"
  ON exercise_catalog FOR SELECT
  TO authenticated
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Esercizi custom: visibili agli atleti del trainer che li ha creati
CREATE POLICY "athlete can read trainer custom exercises"
  ON exercise_catalog FOR SELECT
  TO authenticated
  USING (
    trainer_id IN (
      SELECT trainer_id FROM trainer_athlete
      WHERE athlete_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

-- Il trainer può inserire esercizi custom solo a suo nome
CREATE POLICY "trainer can insert custom exercises"
  ON exercise_catalog FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Il trainer può modificare/eliminare solo i propri custom
CREATE POLICY "trainer can update own custom exercises"
  ON exercise_catalog FOR UPDATE
  TO authenticated
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "trainer can delete own custom exercises"
  ON exercise_catalog FOR DELETE
  TO authenticated
  USING (trainer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- ── RPC: catalogo visibile al trainer (globali + propri custom) ──
CREATE OR REPLACE FUNCTION get_exercise_catalog(p_trainer_id uuid, p_search text DEFAULT '', p_muscle text DEFAULT '')
RETURNS TABLE (
  id           uuid,
  name         text,
  muscle_group text,
  equipment    text,
  difficulty   text,
  description  text,
  video_url    text,
  is_custom    boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id, name, muscle_group, equipment, difficulty, description, video_url,
    (trainer_id IS NOT NULL) AS is_custom
  FROM exercise_catalog
  WHERE
    (trainer_id IS NULL OR trainer_id = p_trainer_id)
    AND (p_search = '' OR name ILIKE '%' || p_search || '%')
    AND (p_muscle = '' OR muscle_group = p_muscle)
  ORDER BY muscle_group, name;
$$;

-- ── SEED: esercizi globali pre-compilati ──────────────────────
INSERT INTO exercise_catalog (name, muscle_group, equipment, difficulty, description) VALUES

-- PETTO
('Panca Piana', 'Petto', 'bilanciere', 'intermedio',
 'Stendi sulla panca con gli occhi sotto il bilanciere. Impugna la barra con presa leggermente più larga delle spalle. Scendi controllato fino a sfiorare il petto e spingi verso l''alto.'),
('Panca Inclinata con Bilanciere', 'Petto', 'bilanciere', 'intermedio',
 'Inclinazione 30-45°. Esecuzione simile alla panca piana, favorisce la parte alta del petto.'),
('Panca Declinata con Bilanciere', 'Petto', 'bilanciere', 'avanzato',
 'Panca declinata 15-30°. Maggior attivazione del pettorale inferiore.'),
('Panca con Manubri', 'Petto', 'manubri', 'principiante',
 'Come la panca piana ma con manubri, permettendo maggior range di movimento e libertà di rotazione del polso.'),
('Croci ai Cavi', 'Petto', 'cavi', 'intermedio',
 'In piedi tra due carrucole alte. Porta le maniglie verso il centro incrociandole. Mantieni un lieve piegamento dei gomiti per tutta la ripetizione.'),
('Push-up', 'Petto', 'corpo libero', 'principiante',
 'Posizione a terra con mani leggermente più larghe delle spalle. Scendi fino a sfiorare il suolo con il petto e risali.'),
('Dip alle Parallele', 'Petto', 'corpo libero', 'avanzato',
 'Inclina il busto in avanti per enfatizzare il petto. Scendi fino a 90° di flessione del gomito.'),

-- DORSO
('Stacco da Terra', 'Dorso', 'bilanciere', 'avanzato',
 'Piedi alla larghezza dei fianchi, schiena neutra. Impugna il bilanciere con presa prona o mista. Spingi il suolo con i piedi mentre porti i fianchi in avanti.'),
('Trazioni alla Sbarra', 'Dorso', 'corpo libero', 'intermedio',
 'Presa prona più larga delle spalle. Porta il mento sopra la sbarra contraendo il gran dorsale. Scendi lentamente.'),
('Lat Machine', 'Dorso', 'macchina', 'principiante',
 'Seduto, prendi la barra con presa larga. Porta la barra al petto tenendo il busto leggermente inclinato.'),
('Rematore con Bilanciere', 'Dorso', 'bilanciere', 'intermedio',
 'Busto inclinato a ~45°, schiena neutra. Porta il bilanciere verso l''addome, stringendo le scapole nella fase concentrica.'),
('Rematore con Manubrio', 'Dorso', 'manubri', 'principiante',
 'Appoggia il ginocchio e la mano sulla panca. Porta il manubrio verso il fianco stringendo il dorsale.'),
('Pulley al Cavo Basso', 'Dorso', 'cavi', 'principiante',
 'Seduto, gambe leggermente piegate. Tira la maniglia verso l''addome mantenendo il busto verticale.'),
('Pullover con Manubrio', 'Dorso', 'manubri', 'intermedio',
 'Steso sulla panca trasversalmente. Porta il manubrio dietro la testa a braccia quasi tese, poi risali.'),

-- SPALLE
('Lento Avanti con Bilanciere', 'Spalle', 'bilanciere', 'intermedio',
 'In piedi o seduto. Bilanciere davanti al viso, porta sopra la testa a braccia estese. Scendi controllato.'),
('Lento con Manubri', 'Spalle', 'manubri', 'principiante',
 'Seduto o in piedi. Porta i manubri sopra la testa da posizione a 90° di flessione del gomito.'),
('Alzate Laterali', 'Spalle', 'manubri', 'principiante',
 'In piedi, braccia lungo i fianchi. Solleva i manubri lateralmente fino all''altezza delle spalle con i gomiti leggermente piegati.'),
('Alzate Frontali', 'Spalle', 'manubri', 'principiante',
 'Solleva i manubri frontalmente fino all''altezza delle spalle alternando o insieme.'),
('Alzate al Cavo', 'Spalle', 'cavi', 'intermedio',
 'Carrucola bassa. Tira lateralmente o frontalmente lavorando sul deltoide in modo continuo.'),
('Face Pull', 'Spalle', 'cavi', 'principiante',
 'Carrucola alta con corda. Tira verso il viso aprendo i gomiti verso l''esterno. Ottimo per il deltoide posteriore e i rotatori.'),
('Arnold Press', 'Spalle', 'manubri', 'intermedio',
 'Parti con i manubri davanti al viso, palmi verso di te. Ruota durante la spinta portando i palmi in avanti a braccia estese.'),

-- BICIPITI
('Curl con Bilanciere', 'Bicipiti', 'bilanciere', 'principiante',
 'In piedi, impugna il bilanciere con presa supina. Porta verso le spalle flettendo solo l''avambraccio. Scendi lento.'),
('Curl con Manubri', 'Bicipiti', 'manubri', 'principiante',
 'Alternato o contemporaneo. Puoi ruotare il polso verso l''esterno (supinazione) nella fase concentrica.'),
('Curl al Cavo', 'Bicipiti', 'cavi', 'principiante',
 'Carrucola bassa con barra o maniglia. Tensione costante sul bicipite lungo tutto il movimento.'),
('Curl Hammer', 'Bicipiti', 'manubri', 'principiante',
 'Presa neutra (pollice verso l''alto). Coinvolge maggiormente il brachiale e il brachioradiale.'),
('Curl Concentrato', 'Bicipiti', 'manubri', 'intermedio',
 'Seduto, gomito appoggiato sull''interno coscia. Movimento isolato e controllato.'),
('Curl su Panca Inclinata', 'Bicipiti', 'manubri', 'intermedio',
 'Panca inclinata 45-60°. Maggior allungamento del bicipite nella fase eccentrica.'),

-- TRICIPITI
('French Press', 'Tricipiti', 'bilanciere', 'intermedio',
 'Steso su panca. Bilanciere sopra la testa, piega i gomiti portando verso la fronte mantenendo i gomiti fermi.'),
('Pushdown al Cavo', 'Tricipiti', 'cavi', 'principiante',
 'Carrucola alta con barra o corda. Spingi verso il basso estendendo i gomiti. Tieni i gomiti vicini ai fianchi.'),
('Dip con Panca', 'Tricipiti', 'corpo libero', 'principiante',
 'Mani sulla panca dietro di te. Scendi piegando i gomiti e risali estendendoli.'),
('Estensione Overhead con Manubrio', 'Tricipiti', 'manubri', 'principiante',
 'In piedi o seduto. Manubrio dietro la testa con entrambe le mani. Estendi i gomiti portando il manubrio in alto.'),
('Kickback con Manubrio', 'Tricipiti', 'manubri', 'principiante',
 'Busto inclinato, gomito fisso vicino al fianco. Estendi l''avambraccio verso l''indietro.'),

-- GAMBE
('Squat con Bilanciere', 'Gambe', 'bilanciere', 'intermedio',
 'Bilanciere in appoggio sui trapezi. Piedi alla larghezza delle spalle con punte leggermente verso l''esterno. Scendi fino a 90° o oltre mantenendo la schiena neutra.'),
('Leg Press', 'Gambe', 'macchina', 'principiante',
 'Siediti sulla macchina. Posiziona i piedi sulla pedana. Spingi controllando la discesa. Non bloccare le ginocchia in estensione.'),
('Affondi', 'Gambe', 'corpo libero', 'principiante',
 'Passo in avanti, scendi fino a sfiorare il ginocchio posteriore a terra. Mantieni il busto eretto.'),
('Romanian Deadlift', 'Gambe', 'bilanciere', 'intermedio',
 'Gambe quasi tese. Scendi portando il bilanciere lungo le gambe fino a sentire lo stiramento dei femorali.'),
('Leg Curl Sdraiato', 'Gambe', 'macchina', 'principiante',
 'Sdraiato sul pancino. Porta i talloni verso i glutei flettendo i ginocchi. Isola i femorali.'),
('Leg Extension', 'Gambe', 'macchina', 'principiante',
 'Seduto sulla macchina. Estendi le gambe portando i piedi in alto. Isola il quadricipite.'),
('Calf Raise in Piedi', 'Gambe', 'macchina', 'principiante',
 'In piedi sulla macchina o su un gradino. Solleva i talloni il più in alto possibile, poi scendi oltre il livello del gradino.'),
('Hack Squat', 'Gambe', 'macchina', 'intermedio',
 'Macchina hack squat. Piedi avanzati per maggior attivazione del quadricipite. Scendi fino a 90°.'),
('Bulgarian Split Squat', 'Gambe', 'manubri', 'avanzato',
 'Piede posteriore su panca. Scendi fino a sfiorare il ginocchio posteriore al suolo. Molto efficace per glutei e quadricipiti.'),

-- ADDOMINALI
('Crunch', 'Addominali', 'corpo libero', 'principiante',
 'A terra, mani dietro la testa. Solleva le spalle contraendo gli addominali senza tirare il collo.'),
('Plank', 'Addominali', 'corpo libero', 'principiante',
 'Posizione su avambracci e punte dei piedi. Mantieni il corpo allineato senza cedere sui fianchi.'),
('Russian Twist', 'Addominali', 'corpo libero', 'intermedio',
 'Seduto con gambe sollevate. Ruota il busto destra e sinistra. Puoi aggiungere un peso per aumentare l''intensità.'),
('Leg Raise', 'Addominali', 'corpo libero', 'intermedio',
 'Steso a terra o appeso alla sbarra. Porta le gambe tese verso l''alto contraendo il basso addome.'),
('Ab Wheel', 'Addominali', 'attrezzo', 'avanzato',
 'In ginocchio o in piedi. Rotola la ruota in avanti mantenendo il core attivo, poi torna nella posizione di partenza.'),
('Cable Crunch', 'Addominali', 'cavi', 'intermedio',
 'In ginocchio davanti alla carrucola alta con corda. Piega il busto verso il basso contraendo gli addominali.'),

-- GLUTEI
('Hip Thrust con Bilanciere', 'Glutei', 'bilanciere', 'intermedio',
 'Schiena appoggiata alla panca, bilanciere sui fianchi. Spingi i fianchi verso l''alto contraendo i glutei. Tieni il mento sul petto.'),
('Glute Bridge', 'Glutei', 'corpo libero', 'principiante',
 'A terra, piedi appoggiati. Solleva i fianchi contraendo i glutei. Versione base dell''hip thrust.'),
('Abductor Machine', 'Glutei', 'macchina', 'principiante',
 'Seduto sulla macchina. Apri le gambe verso l''esterno contro resistenza. Isola il gluteo medio.');
