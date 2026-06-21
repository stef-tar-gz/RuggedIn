import { SettingsScreen } from '@/components/SettingsScreen';

export default function TrainerSettings() {
  return (
    <SettingsScreen
      backLabel="Profilo"
      notificationSubtitle="Nuove richieste e messaggi dagli atleti"
      privacyLabel="Profilo visibile agli atleti"
      privacySubtitle="Gli atleti possono trovarti nella ricerca"
      deleteMessage="Questa azione è irreversibile. Tutti i tuoi dati, atleti e schede create verranno eliminati definitivamente."
    />
  );
}
