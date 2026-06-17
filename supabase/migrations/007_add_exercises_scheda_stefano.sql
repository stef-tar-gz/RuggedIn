-- Migration 007: aggiunta esercizi dalla scheda di Stefano

INSERT INTO exercise_catalog (name, muscle_group, equipment, difficulty) VALUES
  -- Petto
  ('Peck Fly',                              'Petto',    'cavi',      'intermedio'),
  ('Panca 30° Multipower',                  'Petto',    'macchina',  'intermedio'),
  ('Chest Press',                           'Petto',    'macchina',  'principiante'),
  ('Spinte Manubri 45°',                    'Petto',    'manubri',   'intermedio'),
  -- Dorso
  ('High Row',                              'Dorso',    'macchina',  'intermedio'),
  ('Low Row Unilaterale',                   'Dorso',    'cavi',      'intermedio'),
  -- Gambe
  ('Pendulum Squat',                        'Gambe',    'macchina',  'avanzato'),
  ('Leg Curl Seduto',                       'Gambe',    'macchina',  'principiante'),
  ('Squat Multipower',                      'Gambe',    'macchina',  'intermedio'),
  -- Spalle
  ('Alzate Laterali Cavigliera',            'Spalle',   'cavi',      'intermedio'),
  ('Shoulder Press',                        'Spalle',   'macchina',  'principiante'),
  -- Tricipiti
  ('Push Down Unilaterale',                 'Tricipiti','cavi',      'principiante'),
  -- Bicipiti
  ('Curl Martello Panca Scott Unilaterale', 'Bicipiti', 'manubri',   'intermedio');
