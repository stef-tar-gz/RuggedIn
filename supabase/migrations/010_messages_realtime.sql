-- Necessario per postgres_changes con filtri server-side
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Aggiunge messages alla pubblicazione Realtime di Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
