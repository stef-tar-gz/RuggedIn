import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '@/components/ChatScreen';

export default function TrainerChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  return <ChatScreen otherUserId={id} otherUserName={name ?? 'Atleta'} backPath="/(trainer)/athlete/[id]" />;
}
