import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';

interface AvatarProps {
  uri: string | null;
  size?: number;
  hasStory?: boolean;
  onPress?: () => void;
  username?: string;
}

export function Avatar({ uri, size = 44, hasStory = false, onPress, username }: AvatarProps) {
  const renderAvatar = () => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
          {username ? username[0].toUpperCase() : '?'}
        </Text>
      </LinearGradient>
    );
  };

  if (hasStory) {
    return (
      <Pressable onPress={onPress} style={styles.storyContainer}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={[styles.storyRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.storyInner, { width: size + 2, height: size + 2, borderRadius: (size + 2) / 2 }]}>
            {renderAvatar()}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  if (onPress) {
    return <Pressable onPress={onPress}>{renderAvatar()}</Pressable>;
  }

  return renderAvatar();
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.border,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.white,
  },
  storyContainer: {},
  storyRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInner: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
  },
});
