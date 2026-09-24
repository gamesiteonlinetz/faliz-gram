import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  User,
  Lock,
  Bell,
  Eye,
  HelpCircle,
  Info,
  Shield,
  LogOut,
  Trash2,
  Moon,
  Globe,
  Mail,
  Phone,
  FileText,
  Heart,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';

type Section = 'main' | 'editProfile' | 'notifications' | 'privacy' | 'help' | 'about';

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [section, setSection] = useState<Section>('main');
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [likeNotifs, setLikeNotifs] = useState(true);
  const [commentNotifs, setCommentNotifs] = useState(true);
  const [followNotifs, setFollowNotifs] = useState(true);
  const [dmNotifs, setDmNotifs] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);
  const [storySharing, setStorySharing] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const openEditProfile = () => {
    setEditName(profile?.full_name ?? '');
    setEditUsername(profile?.username ?? '');
    setEditBio(profile?.bio ?? '');
    setEditAvatar(profile?.avatar_url ?? '');
    setSection('editProfile');
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        username: editUsername.toLowerCase(),
        bio: editBio,
        avatar_url: editAvatar || null,
      })
      .eq('id', profile.id);
    setSavingProfile(false);
    if (error) {
      Alert.alert('Could not save', 'Please check your username is unique and try again.');
      return;
    }
    await refreshProfile();
    setSection('main');
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'New password and confirmation must be the same.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      Alert.alert('Could not change password', 'Please try again.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Success', 'Your password has been updated.');
    setSection('main');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your posts, comments, and likes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please contact support to delete your account. This action is irreversible.');
          },
        },
      ]
    );
  };

  const renderToggle = (
    icon: React.ReactNode,
    label: string,
    value: boolean,
    onToggle: (v: boolean) => void
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        {icon}
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );

  const renderNavRow = (icon: React.ReactNode, label: string, onPress: () => void, color = Colors.text) => (
    <Pressable style={styles.navRow} onPress={onPress}>
      <View style={styles.navLeft}>
        <View style={[styles.navIcon, color !== Colors.text && { backgroundColor: '#FEF2F2' }]}>{icon}</View>
        <Text style={[styles.navLabel, color !== Colors.text && { color }]}>{label}</Text>
      </View>
      <ChevronRight color={Colors.textSecondary} size={20} />
    </Pressable>
  );

  if (section === 'editProfile') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}>
            <ArrowLeft color={Colors.text} size={24} />
          </Pressable>
          <Text style={styles.subHeaderTitle}>Edit Profile</Text>
          <Pressable onPress={saveProfile} disabled={savingProfile}>
            {savingProfile ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textSecondary} />
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput style={styles.textInput} value={editUsername} onChangeText={setEditUsername} placeholder="username" placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} />
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput style={[styles.textInput, styles.bioInput]} value={editBio} onChangeText={setEditBio} placeholder="Write something about yourself" placeholderTextColor={Colors.textSecondary} multiline textAlignVertical="top" />
          <Text style={styles.inputLabel}>Avatar URL</Text>
          <TextInput style={styles.textInput} value={editAvatar} onChangeText={setEditAvatar} placeholder="Paste image URL" placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} />
        </ScrollView>
      </View>
    );
  }

  if (section === 'notifications') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>Notifications</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody}>
          <Text style={styles.sectionHeading}>Push Notifications</Text>
          <View style={styles.card}>
            {renderToggle(<Bell color={Colors.text} size={20} />, 'Push Notifications', pushNotifs, setPushNotifs)}
            {renderToggle(<Mail color={Colors.text} size={20} />, 'Email Notifications', emailNotifs, setEmailNotifs)}
          </View>
          <Text style={styles.sectionHeading}>Activity</Text>
          <View style={styles.card}>
            {renderToggle(<Heart color={Colors.text} size={20} />, 'Likes', likeNotifs, setLikeNotifs)}
            {renderToggle(<FileText color={Colors.text} size={20} />, 'Comments', commentNotifs, setCommentNotifs)}
            {renderToggle(<User color={Colors.text} size={20} />, 'New Followers', followNotifs, setFollowNotifs)}
            {renderToggle(<Mail color={Colors.text} size={20} />, 'Direct Messages', dmNotifs, setDmNotifs)}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (section === 'privacy') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>Privacy & Security</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody}>
          <Text style={styles.sectionHeading}>Account Privacy</Text>
          <View style={styles.card}>
            {renderToggle(<Lock color={Colors.text} size={20} />, 'Private Account', privateAccount, setPrivateAccount)}
          </View>
          <Text style={styles.sectionHeading}>Visibility</Text>
          <View style={styles.card}>
            {renderToggle(<Eye color={Colors.text} size={20} />, 'Activity Status', activityStatus, setActivityStatus)}
            {renderToggle(<Heart color={Colors.text} size={20} />, 'Allow Story Sharing', storySharing, setStorySharing)}
          </View>
          <Text style={styles.sectionHeading}>Security</Text>
          <View style={styles.card}>
            {renderNavRow(<Lock color={Colors.text} size={20} />, 'Change Password', () => setSection('editProfile'))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (section === 'help') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>Help & Support</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody}>
          <View style={styles.card}>
            {renderNavRow(<HelpCircle color={Colors.text} size={20} />, 'Help Center', () => {})}
            {renderNavRow(<Info color={Colors.text} size={20} />, 'Report a Problem', () => {})}
            {renderNavRow(<Shield color={Colors.text} size={20} />, 'Community Guidelines', () => {})}
            {renderNavRow(<FileText color={Colors.text} size={20} />, 'Terms of Service', () => {})}
            {renderNavRow(<FileText color={Colors.text} size={20} />, 'Privacy Policy', () => {})}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (section === 'about') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>About</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.aboutContent}>
          <View style={styles.aboutLogo}>
            <Text style={styles.aboutLogoText}>Faliz Gram</Text>
          </View>
          <Text style={styles.aboutVersion}>Version 2.0.0</Text>
          <Text style={styles.aboutTagline}>Share your moments with the world</Text>
          <View style={styles.aboutCard}>
            {renderNavRow(<Info color={Colors.text} size={20} />, 'App Version', () => {})}
            {renderNavRow(<Globe color={Colors.text} size={20} />, 'Region', () => {})}
            {renderNavRow(<Mail color={Colors.text} size={20} />, 'Contact Us', () => {})}
            {renderNavRow(<Heart color={Colors.text} size={20} />, 'Rate Faliz Gram', () => {})}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.subHeader}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={Colors.text} size={24} />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Settings</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView style={styles.scrollBody}>
        <Text style={styles.sectionHeading}>Account</Text>
        <View style={styles.card}>
          {renderNavRow(<User color={Colors.text} size={20} />, 'Edit Profile', openEditProfile)}
          {renderNavRow(<Lock color={Colors.text} size={20} />, 'Privacy & Security', () => setSection('privacy'))}
        </View>

        <Text style={styles.sectionHeading}>Notifications</Text>
        <View style={styles.card}>
          {renderNavRow(<Bell color={Colors.text} size={20} />, 'Notification Settings', () => setSection('notifications'))}
        </View>

        <Text style={styles.sectionHeading}>Preferences</Text>
        <View style={styles.card}>
          {renderToggle(<Moon color={Colors.text} size={20} />, 'Dark Mode', darkMode, setDarkMode)}
        </View>

        <Text style={styles.sectionHeading}>Support</Text>
        <View style={styles.card}>
          {renderNavRow(<HelpCircle color={Colors.text} size={20} />, 'Help & Support', () => setSection('help'))}
          {renderNavRow(<Info color={Colors.text} size={20} />, 'About Faliz Gram', () => setSection('about'))}
        </View>

        <Text style={styles.sectionHeading}>Account Actions</Text>
        <View style={styles.card}>
          {renderNavRow(<LogOut color={Colors.error} size={20} />, 'Sign Out', handleSignOut, Colors.error)}
          {renderNavRow(<Trash2 color={Colors.error} size={20} />, 'Delete Account', handleDeleteAccount, Colors.error)}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Faliz Gram v2.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  subHeaderTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.xl, color: Colors.text },
  spacer: { width: 24 },
  scrollBody: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  sectionHeading: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, overflow: 'hidden' as any },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  navIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleLabel: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  saveButton: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.primary },
  inputLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.xs },
  textInput: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, backgroundColor: Colors.surface },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl },
  footerText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary },
  aboutContent: { alignItems: 'center', padding: Spacing.xl },
  aboutLogo: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  aboutLogoText: { fontFamily: 'Inter-Bold', fontSize: FontSizes.display, color: Colors.text, letterSpacing: -1 },
  aboutVersion: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xs },
  aboutTagline: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  aboutCard: { width: '100%' },
});
