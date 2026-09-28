import { Tabs } from 'expo-router';
import { Home, Search, PlusSquare, Heart, User, PlayCircle, MessageCircle } from 'lucide-react-native';
import { Colors, Shadows } from '@/lib/theme';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

function MessagesButton() {
  return (
    <Pressable onPress={() => router.push('/messages')} style={styles.messagesIcon}>
      <MessageCircle color={Colors.text} size={26} strokeWidth={2} />
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          backgroundColor: Colors.background,
          height: 54,
          ...Shadows.small,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
          headerRight: () => <MessagesButton />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarIcon: ({ color, size }) => <PlayCircle color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ color, size }) => <PlusSquare color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  messagesIcon: {
    paddingHorizontal: 4,
  },
});
