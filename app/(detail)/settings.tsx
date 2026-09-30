import { useState, useEffect } from 'react';
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
  BadgeCheck,
  KeyRound,
  MessageCircle,
  CreditCard,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';

type Section = 'main' | 'editProfile' | 'notifications' | 'privacy' | 'help' | 'about' | 'verification' | 'subscription';

export default function SettingsScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();
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
  const [dmPermission, setDmPermission] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [verifyCode, setVerifyCode] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<'active' | 'inactive' | 'none' | null>(null);
  const [subPeriodEnd, setSubPeriodEnd] = useState<number | null>(null);

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (section === 'subscription' && profile) {
      checkSubscriptionStatus();
    }
  }, [section, profile?.id]);

  useEffect(() => {
    if (section === 'privacy' && profile) {
      loadPrivacySettings();
    }
  }, [section, profile?.id]);

  const loadPrivacySettings = async () => {
    if (!profile) return;
    setDmPermission(profile.dm_permission ?? 'everyone');
  };

  const updateDmPermission = async (value: 'everyone' | 'followers' | 'nobody') => {
    setDmPermission(value);
    if (!profile) return;
    await supabase.from('profiles').update({ dm_permission: value }).eq('id', profile.id);
    await refreshProfile();
  };

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

  const handleLifetimeVerify = async () => {
    if (!verifyCode.trim()) {
      Alert.alert('Enter a code', 'Please enter the verification code.');
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc('redeem_lifetime_verification', { p_code: verifyCode.trim() });
    setVerifying(false);
    if (error) {
      Alert.alert('Verification Failed', error.message || 'The code is invalid or all badges have been claimed.');
      return;
    }
    setVerifyCode('');
    await refreshProfile();
    Alert.alert('Verified!', data || 'You now have a lifetime verified badge.');
  };

  const handleAdminVerify = async () => {
    if (!adminToken.trim()) {
      Alert.alert('Enter token', 'Please enter the admin verification token.');
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc('apply_admin_verification', { p_token: adminToken.trim() });
    setVerifying(false);
    if (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid admin token.');
      return;
    }
    setAdminToken('');
    await refreshProfile();
    Alert.alert('Admin Verified!', data || 'Admin verification applied successfully.');
  };

  const checkSubscriptionStatus = async () => {
    if (!profile) return;
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!customer?.customer_id) { setSubStatus('none'); return; }
    const { data: sub } = await supabase
      .from('stripe_subscriptions')
      .select('status, current_period_end')
      .eq('customer_id', customer.customer_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!sub) { setSubStatus('none'); return; }
    if (sub.status === 'active' || sub.status === 'trialing') {
      setSubStatus('active');
      setSubPeriodEnd(sub.current_period_end);
    } else {
      setSubStatus('inactive');
      setSubPeriodEnd(sub.current_period_end);
    }
  };

  const handleSubscribe = async () => {
    if (!profile || !session) return;
    setSubLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;
      if (!accessToken) { Alert.alert('Error', 'Please sign in again.'); return; }
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          price_id: 'price_verification_monthly',
          success_url: window.location.href,
          cancel_url: window.location.href,
          mode: 'subscription',
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Error', err.error || 'Could not start checkout.');
        return;
      }
      const { url } = await response.json();
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch {
      Alert.alert('Error', 'Could not connect to payment service.');
    } finally {
      setSubLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Your verification badge will be removed when your current billing period ends. You can re-subscribe anytime.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { text: 'Cancel Subscription', style: 'destructive', onPress: async () => {
          setSubLoading(true);
          await supabase.rpc('sync_subscription_verification', { p_user_id: profile!.id });
          await refreshProfile();
          await checkSubscriptionStatus();
          setSubLoading(false);
          Alert.alert('Subscription Cancelled', 'Your verification will be removed at the end of the billing period.');
        } },
      ]
    );
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

  if (section === 'subscription') {
    const formatDate = (epoch: number | null) => {
      if (!epoch) return '';
      return new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('verification')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>Verification Subscription</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          <View style={styles.subHero}>
            <View style={styles.verifyIcon}>
              <Sparkles color={Colors.primary} size={36} />
            </View>
            <Text style={styles.verifyTitle}>Verified Badge Subscription</Text>
            <Text style={styles.verifyDescription}>
              Subscribe to get a verified badge next to your username. Your badge stays active as long as your subscription is active.
            </Text>
          </View>

          {subStatus === null ? (
            <ActivityIndicator color={Colors.primary} style={styles.subLoader} />
          ) : subStatus === 'active' ? (
            <View style={styles.card}>
              <View style={styles.subStatusRow}>
                <CheckCircle2 color={Colors.success} size={24} />
                <View style={styles.subStatusInfo}>
                  <Text style={styles.subStatusLabel}>Subscription Active</Text>
                  {subPeriodEnd && (
                    <Text style={styles.subStatusDetail}>Renews on {formatDate(subPeriodEnd)}</Text>
                  )}
                </View>
              </View>
              <Pressable style={styles.cancelButton} onPress={handleCancelSubscription} disabled={subLoading}>
                {subLoading ? (
                  <ActivityIndicator color={Colors.error} size="small" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$4.99</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <View style={styles.subFeatureRow}>
                <CheckCircle2 color={Colors.primary} size={18} />
                <Text style={styles.subFeatureText}>Verified badge next to your username</Text>
              </View>
              <View style={styles.subFeatureRow}>
                <CheckCircle2 color={Colors.primary} size={18} />
                <Text style={styles.subFeatureText}>Cancel anytime, no commitment</Text>
              </View>
              <View style={styles.subFeatureRow}>
                <CheckCircle2 color={Colors.primary} size={18} />
                <Text style={styles.subFeatureText}>Badge stays active while subscribed</Text>
              </View>
              {subStatus === 'inactive' && (
                <View style={styles.subInactiveNote}>
                  <XCircle color={Colors.error} size={16} />
                  <Text style={styles.subInactiveText}>Your subscription is no longer active.</Text>
                </View>
              )}
              <Pressable style={styles.verifyButton} onPress={handleSubscribe} disabled={subLoading}>
                {subLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Subscribe with Stripe</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (section === 'verification') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection('main')}><ArrowLeft color={Colors.text} size={24} /></Pressable>
          <Text style={styles.subHeaderTitle}>Get Verified</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          {profile?.is_verified ? (
            <View style={styles.verifiedBadge}>
              <BadgeCheck color={Colors.primary} size={48} />
              <Text style={styles.verifiedTitle}>You are verified!</Text>
              <Text style={styles.verifiedType}>
                {profile.verification_type === 'lifetime' ? 'Lifetime Verified Badge' : profile.verification_type === 'admin' ? 'Admin Verified' : 'Subscription Verified'}
              </Text>
            </View>
          ) : (
            <View style={styles.verifyIntro}>
              <View style={styles.verifyIcon}>
                <BadgeCheck color={Colors.primary} size={36} />
              </View>
              <Text style={styles.verifyTitle}>Get Verified on Faliz Gram</Text>
              <Text style={styles.verifyDescription}>
                Earn a verified badge next to your username. Two options are available:
              </Text>
            </View>
          )}

          {!profile?.is_verified && (
            <>
              <Text style={styles.sectionHeading}>Subscription Badge</Text>
              <Pressable style={styles.card} onPress={() => setSection('subscription')}>
                <View style={styles.subPromoRow}>
                  <View style={styles.navIcon}><Sparkles color={Colors.primary} size={20} /></View>
                  <View style={styles.subPromoInfo}>
                    <Text style={styles.navLabel}>Get Verified with Subscription</Text>
                    <Text style={styles.subPromoDetail}>$4.99/month - Cancel anytime</Text>
                  </View>
                  <ChevronRight color={Colors.textSecondary} size={20} />
                </View>
              </Pressable>

              <Text style={styles.sectionHeading}>Lifetime Badge</Text>
              <View style={styles.card}>
                <View style={styles.verifyInfoRow}>
                  <Heart color={Colors.error} size={18} />
                  <Text style={styles.verifyInfoText}>Only 2 users can claim a lifetime badge.</Text>
                </View>
                <View style={styles.verifyInfoRow}>
                  <KeyRound color={Colors.text} size={18} />
                  <Text style={styles.verifyInfoText}>Enter the secret code to claim yours.</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  placeholder="Enter verification code"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable style={styles.verifyButton} onPress={handleLifetimeVerify} disabled={verifying}>
                  {verifying ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Claim Lifetime Badge</Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.sectionHeading}>Admin Verification</Text>
              <View style={styles.card}>
                <View style={styles.verifyInfoRow}>
                  <Shield color={Colors.text} size={18} />
                  <Text style={styles.verifyInfoText}>Use the admin token to get verified.</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={adminToken}
                  onChangeText={setAdminToken}
                  placeholder="Enter admin token"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable style={styles.verifyButton} onPress={handleAdminVerify} disabled={verifying}>
                  {verifying ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Apply Admin Verification</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

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
          <Text style={styles.sectionHeading}>Direct Messages</Text>
          <View style={styles.card}>
            <View style={styles.dmHeader}>
              <View style={styles.navIcon}><MessageCircle color={Colors.text} size={20} /></View>
              <Text style={styles.navLabel}>Who can message you</Text>
            </View>
            {(['everyone', 'followers', 'nobody'] as const).map((option) => (
              <Pressable
                key={option}
                style={styles.dmOptionRow}
                onPress={() => updateDmPermission(option)}
              >
                <Text style={styles.dmOptionLabel}>
                  {option === 'everyone' ? 'Everyone' : option === 'followers' ? 'Followers only' : 'No one'}
                </Text>
                <View style={[styles.radioOuter, dmPermission === option && styles.radioOuterSelected]}>
                  {dmPermission === option && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            ))}
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

        <Text style={styles.sectionHeading}>Verification</Text>
        <View style={styles.card}>
          {renderNavRow(<BadgeCheck color={Colors.primary} size={20} />, 'Get Verified', () => setSection('verification'))}
              {profile?.is_verified && (
            <View style={styles.verifiedRow}>
              <BadgeCheck color={Colors.primary} size={22} />
              <Text style={styles.verifiedLabel}>Verified ({profile.verification_type === 'lifetime' ? 'Lifetime' : profile.verification_type === 'admin' ? 'Admin' : 'Subscription'})</Text>
            </View>
          )}
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
  subHeaderTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xxl, color: Colors.text },
  spacer: { width: 24 },
  scrollBody: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  sectionHeading: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, overflow: 'hidden' as any, borderWidth: 1, borderColor: Colors.border },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  navIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleLabel: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  saveButton: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.primary },
  inputLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.xs },
  textInput: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, color: Colors.text, backgroundColor: Colors.surface },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl },
  footerText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary },
  aboutContent: { alignItems: 'center', padding: Spacing.xl },
  aboutLogo: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  aboutLogoText: { fontFamily: 'Inter-Bold', fontSize: FontSizes.display, color: Colors.text, letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.05)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  aboutVersion: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xs },
  aboutTagline: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  aboutCard: { width: '100%' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  verifiedLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.primary },
  verifiedBadge: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.lg },
  verifiedTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xl, color: Colors.text, marginTop: Spacing.md },
  verifiedType: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  verifyIntro: { alignItems: 'center', paddingVertical: Spacing.lg },
  verifyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  verifyTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xl, color: Colors.text, textAlign: 'center' },
  verifyDescription: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 21 },
  verifyInfoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  verifyInfoText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text, flex: 1 },
  verifyButton: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md + 2, alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md },
  verifyButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.white },
  dmHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  dmOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  dmOptionLabel: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  subHero: { alignItems: 'center', paddingVertical: Spacing.lg },
  subLoader: { marginTop: Spacing.xl },
  subStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  subStatusInfo: { flex: 1, gap: 2 },
  subStatusLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text },
  subStatusDetail: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary },
  cancelButton: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, paddingVertical: Spacing.sm + 2, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error, alignItems: 'center' },
  cancelButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.error },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  priceAmount: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xxxl, color: Colors.text },
  pricePeriod: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary },
  subFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  subFeatureText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text, flex: 1 },
  subInactiveNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  subInactiveText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.error },
  subPromoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  subPromoInfo: { flex: 1, gap: 2 },
  subPromoDetail: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary },
});
