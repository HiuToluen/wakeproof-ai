// MOCK: MockAdOverlay - a full-screen mock ad overlay component.
//
// This is a class project. There is no real ad SDK. The overlay simulates a
// reward-ad experience by showing a placeholder, counting down from
// `MOCK_AD_DURATION_SECONDS`, and finally enabling a Close button that the
// caller can use to grant the user a reward (e.g. a snooze credit).
//
// Props:
//   - visible: boolean. Controls whether the modal is shown.
//   - adNumber: number. 1-based index of the current ad in a sequence.
//   - totalAds: number. Total number of ads in the sequence. When > 1, an
//     "Ad N of M" indicator is displayed.
//   - onAdComplete: () => void. Called when the user taps Close after the
//     countdown finishes. The caller is responsible for granting any reward.
//   - onCancel: () => void | undefined. Optional. Triggered by the hardware
//     back gesture. The back gesture is disabled while the countdown is
//     running so the user cannot skip the ad early. Once canClose is true
//     the back gesture fires onCancel, letting the caller abort the flow.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MOCK_AD_DURATION_SECONDS } from '../../constants/premiumConstants';
import { useTheme } from '../../hooks/useTheme';

/**
 * Full-screen mock ad overlay. Renders a dark semi-transparent background,
 * an "Advertisement" label, a gradient placeholder, a countdown timer, and
 * a Close button that is disabled until the countdown reaches 0.
 *
 * @param {{
 *   visible: boolean,
 *   adNumber?: number,
 *   totalAds?: number,
 *   onAdComplete: () => void,
 *   onCancel?: () => void,
 * }} props
 */
export default function MockAdOverlay({
  visible,
  adNumber = 1,
  totalAds = 1,
  onAdComplete,
  onCancel,
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [countdown, setCountdown] = useState(MOCK_AD_DURATION_SECONDS);
  const [canClose, setCanClose] = useState(false);

  // Reset and run the countdown whenever the overlay becomes visible.
  useEffect(() => {
    if (!visible) return undefined;

    setCountdown(MOCK_AD_DURATION_SECONDS);
    setCanClose(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Handle hardware back / Android back gesture.
  // Disabled during countdown. After countdown, fires onCancel so the caller
  // can abort the flow (e.g. cancel a multi-ad snooze sequence).
  const handleRequestClose = () => {
    if (canClose && onCancel) {
      onCancel();
    }
    // During countdown, or when onCancel is not provided, ignore the gesture.
  };

  const handleClosePress = () => {
    if (!canClose) return;
    onAdComplete?.();
  };

  return (
    <Modal
      animationType="fade"
      visible={visible}
      transparent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.overlay}>
          <Text style={styles.adLabel}>Advertisement</Text>

          {totalAds > 1 ? (
            <Text style={styles.indicator}>Ad {adNumber} of {totalAds}</Text>
          ) : null}

          {/* MOCK ad placeholder. No real ad creative is loaded. */}
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Your ad could be here</Text>
          </View>

          <Text style={styles.countdown}>
            Ad ends in {countdown}s...
          </Text>

          {canClose ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleClosePress}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          ) : (
            <View style={[styles.closeButton, styles.closeButtonDisabled]}>
              <Text style={styles.closeTextDisabled}>Close</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  // Ad backdrop — intentionally heavy dark scrim regardless of theme to
  // isolate the mock ad experience (matches a real full-screen ad).
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  adLabel: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  indicator: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    // colors.premium provides the amber/gold tint for the mock ad placeholder
    backgroundColor: colors.premium,
    borderRadius: radius.md,
    height: 200,
    marginTop: spacing.lg,
    width: '100%',
  },
  placeholderText: {
    ...typography.heading,
    color: '#1A1200', // dark text on amber placeholder for contrast
    textAlign: 'center',
  },
  countdown: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  closeButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  closeButtonDisabled: {
    backgroundColor: colors.border,
  },
  closeText: {
    ...typography.label,
    color: colors.onPrimary,
  },
  closeTextDisabled: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
