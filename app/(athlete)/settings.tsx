import { SettingsScreen } from '@/components/SettingsScreen';

export default function AthleteSettings() {
  return (
    <SettingsScreen
      backLabel="Profilo"
      notificationSubtitle="Aggiornamenti schede e messaggi"
      privacyLabel="Profilo visibile ai trainer"
      privacySubtitle="I trainer possono trovarti nella ricerca"
      deleteMessage="Questa azione è irreversibile. Tutti i tuoi dati, schede e progressi verranno eliminati definitivamente."
    />
  );
}
