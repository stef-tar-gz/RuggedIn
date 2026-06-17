import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '@/components/ChatScreen';

export default function AthleteChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  return <ChatScreen otherUserId={id} otherUserName={name ?? 'Trainer'} backPath="/(athlete)/trainer/[id]" />;
}
