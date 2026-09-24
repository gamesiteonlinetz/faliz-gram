import { View, Text, StyleSheet } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { Colors, FontSizes } from '@/lib/theme';

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return <BadgeCheck color={Colors.primary} size={size} strokeWidth={2.5} fill={Colors.white} />;
}

interface UsernameWithBadgeProps {
  username: string;
  isVerified?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  badgeSize?: number;
}

export function UsernameWithBadge({
  username,
  isVerified = false,
  fontSize = FontSizes.md,
  color = Colors.text,
  fontFamily = 'Inter-SemiBold',
  badgeSize = 14,
}: UsernameWithBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={{ fontSize, color, fontFamily }}>{username}</Text>
      {isVerified && <VerifiedBadge size={badgeSize} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
