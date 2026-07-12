// PremiumScreen - Premium subscription paywall / management screen.
//
// Renders three views based on the viewer's auth + premium state:
//   - Guest (no authenticated user): feature list + "Sign in to subscribe"
//     button that navigates the user toward the auth flow.
//   - Free (authenticated, non-premium): feature list + "Subscribe Now"
//     PrimaryButton that calls the MOCK upgrade() action.
//   - Premium: "Premium Active" badge + feature list with "Included" labels.
//
// A deliberately subtle "Manage Subscription" link lives at the very bottom
// of the screen. Tapping it opens a confirmation dialog (Alert.alert); only
// confirming calls the MOCK revert() action, returning the user to free.
//
// MOCK: upgrade / revert are simulated client-side (class project). See
// `src/services/mockPremiumService.js` and `src/hooks/usePremium.js`.
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../hooks/usePremium';
import { colors, spacing, typography } from '../../theme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

// Static feature list shown to every viewer (guest, free, premium).
// "Coming Soon" items always display a muted label regardless of plan.
const FEATURES = [
  {
    id: 'ad-free-snooze',
    title: 'Ad-Free Snooze',
    description: 'Snooze your alarms without watching ads or spending credits.',
    comingSoon: false,
  },
  {
    id: 'sleep-cycle',
    title: 'Sleep Cycle Optimizer',
    description: 'Wake up at the ideal point in your sleep cycle.',
    comingSoon: false,
  },
  {
    id: 'cloud-sync',
    title: 'Cloud Sync',
    description: 'Sync your alarms across all your devices.',
    comingSoon: true,
  },
  {
    id: 'custom-ringtones',
    title: 'Custom Ringtones',
    description: 'Wake up to your own sounds and music.',
    comingSoon: true,
  },
];

/**
 * Renders the left-side status indicator for a single feature row.
 *
 * - Available feature (free/guest): primary-colored checkmark.
 * - Available feature (premium): premium-colored checkmark.
 * - Coming soon (any plan): muted outlined star placeholder.
 */
function FeatureIndicator({ comingSoon, isPremium }) {
  if (comingSoon) {
    return (
      <View style={styles.indicatorComingSoon}>
        <Text style={styles.indicatorComingSoonText}>★</Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.indicator,
        isPremium ? styles.indicatorPremium : styles.indicatorFree,
      ]}
    >
      <Text
        style={[
          styles.indicatorText,
          isPremium ? styles.indicatorTextPremium : styles.indicatorTextFree,
        ]}
      >
        ✓
      </Text>
    </View>
  );
}

export default function PremiumScreen({ onSignIn }) {
  const { user } = useAuth();
  const { isPremium, upgrade, revert } = usePremium();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isGuest = !user;

  const handleUpgrade = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // MOCK: writes plan=PREMIUM directly to Firestore (class project).
      await upgrade();
    } catch (e) {
      setError(mapFirebaseError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // MOCK: writes plan=FREE directly to Firestore (class project).
      await revert();
    } catch (e) {
      setError(mapFirebaseError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleManageSubscription = () => {
    // Confirmation guard so revert does not happen on an accidental tap.
    Alert.alert(
      'Manage Subscription',
      'Cancel your Premium subscription and revert to the free plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: handleRevert },
      ],
      { cancelable: true },
    );
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.heading}>WakeProof Premium</Text>
      <Text style={styles.subtitle}>Unlock the full WakeProof experience.</Text>

      {isPremium ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>★ Premium Active</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        {FEATURES.map((feature) => (
          <View key={feature.id} style={styles.featureItem}>
            <FeatureIndicator comingSoon={feature.comingSoon} isPremium={isPremium} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            {feature.comingSoon ? (
              <Text style={styles.comingSoonBadge}>Coming Soon</Text>
            ) : isPremium ? (
              <Text style={styles.includedBadge}>Included</Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* Call-to-action: differs by auth + premium state. */}
      {isPremium ? null : isGuest ? (
        <SecondaryButton
          title="Sign in to subscribe"
          onPress={onSignIn}
          style={styles.ctaButton}
        />
      ) : (
        <PrimaryButton
          title={busy ? 'Subscribing...' : 'Subscribe Now'}
          onPress={handleUpgrade}
          disabled={busy}
          style={styles.ctaButton}
        />
      )}

      {/*
        Hidden revert link. Deliberately small and low-contrast so it is
        discoverable but not prominent. Only actionable for premium users;
        free / guest viewers see the same subtle text (disabled).
      */}
      <Pressable
        accessibilityRole="button"
        disabled={!isPremium || busy}
        onPress={handleManageSubscription}
        style={styles.manageContainer}
      >
        <Text style={styles.manageText}>Manage Subscription</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.premium,
    borderRadius: 999,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText: {
    ...typography.label,
    color: colors.white,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  featureItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  featureDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  indicator: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  indicatorFree: {
    backgroundColor: colors.primary,
  },
  indicatorPremium: {
    backgroundColor: colors.premium,
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  indicatorTextFree: {
    color: colors.white,
  },
  indicatorTextPremium: {
    color: colors.white,
  },
  indicatorComingSoon: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  indicatorComingSoonText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  comingSoonBadge: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  includedBadge: {
    color: colors.premium,
    fontSize: 12,
    fontWeight: '700',
  },
  ctaButton: {
    marginTop: spacing.lg,
  },
  manageContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  // Intentionally small (fontSize 10) and low-contrast (textSecondary)
  // so the revert affordance is subtle but discoverable.
  manageText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});
