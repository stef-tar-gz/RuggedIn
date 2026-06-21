import { useProfile } from '@/hooks/useProfile';
import { SettingsScreen } from '@/components/SettingsScreen';

export default function AdminSettings() {
  const { profile } = useProfile();

  return (
    <SettingsScreen
      backLabel="Dashboard"
      notificationSubtitle="Richieste, segnalazioni e aggiornamenti"
      privacyLabel="Attività visibile agli utenti"
      privacySubtitle="Gli utenti possono vedere le azioni amministrative"
      deleteMessage="Questa azione è irreversibile. L'account amministratore e tutti i dati associati verranno eliminati definitivamente."
      profileName={profile?.full_name}
      profileRole="Amministratore"
    />
  );
}
