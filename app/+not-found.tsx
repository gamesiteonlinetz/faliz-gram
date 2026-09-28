import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Spacing, Radius } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>404</Text>
        </View>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconText: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  link: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
  },
  linkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
