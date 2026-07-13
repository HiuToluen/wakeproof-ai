// SleepScreen - Sleep Cycle Optimizer (Premium-gated).
//
// Renders two views based on premium status:
//   - Free / Guest: a lock card with premium amber accent, lock icon, and an
//     "Upgrade to Premium" CTA that navigates to the PremiumScreen. The
//     PremiumScreen handles guests by showing a "Sign in to subscribe" prompt.
//   - Premium: the full sleep cycle optimizer with a mode toggle ("I want to
//     wake at..." / "I want to sleep at..."), an hour/minute time picker, four
//     suggestion cards (each showing formatted time, cycle count, total sleep
//     duration, a color-coded quality badge, and a "Create Alarm" button), and
//     a timeline visualization showing the sleep cycle segments for the
//     selected suggestion.
//
// Premium state is derived reactively from `usePremium()` so upgrading /
// reverting on another screen instantly unlocks / re-locks this screen.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import TimeInput from '../../components/alarm/TimeInput';
import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { usePremium } from '../../hooks/usePremium';
import {
  calculateBedtimes,
  calculateWakeTimes,
  FALL_ASLEEP_MINUTES,
  formatSleepTime,
  formatTime,
  SLEEP_CYCLE_MINUTES,
} from '../../utils/sleepCycle';
import { colors, spacing, typography } from '../../theme';

// Mode toggle values.
const MODE_WAKE_AT = 'wake_at'; // "I want to wake at..."
const MODE_SLEEP_AT = 'sleep_at'; // "I want to sleep at..."

// Default target time: 07:00.
const DEFAULT_HOUR = '07';
const DEFAULT_MINUTE = '00';

// Quality badge background colors keyed by quality label.
const QUALITY_COLORS = {
  Ideal: colors.success,
  Good: colors.info,
  Short: colors.warning,
  Minimal: colors.danger,
};

// A small palette used to visually differentiate cycle segments in the timeline.
// Cycles through four hues so adjacent blocks are always distinguishable.
const TIMELINE_COLORS = [
  colors.primary,
  colors.info,
  colors.success,
  colors.premium,
];

// Phase labels that cycle through the sleep stages within each 90-min block.
const PHASE_LABELS = ['Light', 'Deep', 'REM'];

/**
 * Lock card shown to free users and guests. Features a premium amber accent,
 * a lock icon, explanatory text, and an "Upgrade to Premium" CTA.
 */
function LockedSleepView() {
  const navigation = useNavigation();

  // Both free and guest users navigate to the PremiumScreen. For guests the
  // PremiumScreen shows a "Sign in to subscribe" prompt that leads to auth,
  // satisfying VAL-SLEEP-002 (free -> Premium) and VAL-SLEEP-004 (guest ->
  // auth / Premium).
  const handleUpgrade = () => {
    navigation.navigate('Premium');
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.heading}>Sleep Cycle</Text>
      <View style={styles.lockCard}>
        <View style={styles.lockAccentBar} />
        <View style={styles.lockContent}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>Sleep Cycle Optimizer</Text>
          <Text style={styles.lockText}>
            Sleep Cycle Optimizer is a Premium feature
          </Text>
          <Text style={styles.lockSubtext}>
            Wake up at the ideal point in your sleep cycle with personalized
            bedtime and wake-time recommendations.
          </Text>
          <PrimaryButton
            title="Upgrade to Premium"
            onPress={handleUpgrade}
            style={styles.lockCta}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

/**
 * A single suggestion card showing formatted time, cycle count, total sleep
 * duration, a color-coded quality badge, and a "Create Alarm" button. Tapping
 * the card body selects it (updating the timeline).
 */
function SuggestionCard({ suggestion, selected, onSelect, onCreateAlarm }) {
  const qualityColor = QUALITY_COLORS[suggestion.quality] || colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTime}>
          {formatTime(suggestion.time.hour, suggestion.time.minute)}
        </Text>
        <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
          <Text style={styles.qualityBadgeText}>{suggestion.quality}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.detailLabel}>
          {suggestion.cycles} {suggestion.cycles === 1 ? 'cycle' : 'cycles'}
        </Text>
        <Text style={styles.detailLabel}>
          {formatSleepTime(suggestion.totalSleepMinutes)}
        </Text>
      </View>
      <PrimaryButton
        title="Create Alarm"
        onPress={onCreateAlarm}
        style={styles.cardButton}
      />
    </Pressable>
  );
}

/**
 * Timeline visualization: a horizontal bar showing the fall-asleep buffer, one
 * colored block per 90-minute sleep cycle, and a wake marker. The number of
 * cycle segments matches the selected suggestion's cycle count.
 */
function SleepTimeline({ suggestion }) {
  const { cycles } = suggestion;

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.timelineTitle}>
        Sleep Timeline · {cycles} {cycles === 1 ? 'cycle' : 'cycles'}
      </Text>
      <View style={styles.timelineBar}>
        {/* Fall-asleep buffer segment */}
        <View
          style={[
            styles.timelineSegment,
            styles.fallAsleepSegment,
          ]}
        >
          <Text style={styles.segmentEmoji}>😴</Text>
        </View>
        {/* One colored block per sleep cycle */}
        {Array.from({ length: cycles }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.timelineSegment,
              styles.cycleSegment,
              { backgroundColor: TIMELINE_COLORS[index % TIMELINE_COLORS.length] },
            ]}
          >
            <Text style={styles.cycleSegmentText}>{index + 1}</Text>
          </View>
        ))}
        {/* Wake marker */}
        <View
          style={[
            styles.timelineSegment,
            styles.wakeSegment,
          ]}
        >
          <Text style={styles.segmentEmoji}>🔔</Text>
        </View>
      </View>
      <View style={styles.timelineLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.fallAsleepSegment]} />
          <Text style={styles.legendText}>Fall asleep</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Light / Deep / REM cycles ({SLEEP_CYCLE_MINUTES}m)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.wakeSegment]} />
          <Text style={styles.legendText}>Wake</Text>
        </View>
      </View>
      <Text style={styles.timelineNote}>
        Each cycle is approximately {SLEEP_CYCLE_MINUTES} minutes. Allow {FALL_ASLEEP_MINUTES} minutes to fall asleep.
      </Text>
    </View>
  );
}

/**
 * The full sleep cycle optimizer for premium users.
 */
function SleepOptimizer() {
  const navigation = useNavigation();
  const [mode, setMode] = useState(MODE_WAKE_AT);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Recalculate suggestions whenever mode or target time changes.
  const suggestions = useMemo(() => {
    const time = {
      hour: Math.max(0, Math.min(23, Number(hour) || 0)),
      minute: Math.max(0, Math.min(59, Number(minute) || 0)),
    };
    return mode === MODE_WAKE_AT
      ? calculateBedtimes(time)
      : calculateWakeTimes(time);
  }, [mode, hour, minute]);

  // The currently selected suggestion drives the timeline. Clamp the index to
  // the suggestion count so it never goes out of bounds after a mode switch.
  const safeIndex = Math.min(selectedIndex, suggestions.length - 1);
  const selectedSuggestion = suggestions[safeIndex];

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedIndex(0);
  };

  const handleSelectCard = (index) => {
    setSelectedIndex(index);
  };

  // Navigates to AlarmForm with prefilled hour/minute from the suggestion.
  const handleCreateAlarm = (suggestion) => {
    navigation.navigate('AlarmForm', {
      prefillHour: suggestion.time.hour,
      prefillMinute: suggestion.time.minute,
    });
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.heading}>Sleep Cycle Optimizer</Text>
      <Text style={styles.subtitle}>
        {mode === MODE_WAKE_AT
          ? 'Find the best bedtimes for your target wake time.'
          : 'Find the best wake times for your target bedtime.'}
      </Text>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Pressable
          accessibilityRole="button"
          onPress={() => handleModeChange(MODE_WAKE_AT)}
          style={[
            styles.modeOption,
            mode === MODE_WAKE_AT && styles.modeOptionActive,
          ]}
        >
          <Text
            style={[
              styles.modeText,
              mode === MODE_WAKE_AT && styles.modeTextActive,
            ]}
          >
            I want to wake at...
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => handleModeChange(MODE_SLEEP_AT)}
          style={[
            styles.modeOption,
            mode === MODE_SLEEP_AT && styles.modeOptionActive,
          ]}
        >
          <Text
            style={[
              styles.modeText,
              mode === MODE_SLEEP_AT && styles.modeTextActive,
            ]}
          >
            I want to sleep at...
          </Text>
        </Pressable>
      </View>

      {/* Time picker */}
      <View style={styles.timePickerContainer}>
        <Text style={styles.timePickerLabel}>
          {mode === MODE_WAKE_AT ? 'Wake time' : 'Bedtime'}
        </Text>
        <TimeInput
          hour={hour}
          minute={minute}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />
      </View>

      {/* Suggestion cards */}
      <Text style={styles.sectionTitle}>
        {mode === MODE_WAKE_AT ? 'Recommended bedtimes' : 'Recommended wake times'}
      </Text>
      <View style={styles.cardsContainer}>
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={`${mode}-${index}`}
            suggestion={suggestion}
            selected={index === safeIndex}
            onSelect={() => handleSelectCard(index)}
            onCreateAlarm={() => handleCreateAlarm(suggestion)}
          />
        ))}
      </View>

      {/* Timeline visualization for the selected suggestion */}
      {selectedSuggestion ? (
        <SleepTimeline suggestion={selectedSuggestion} />
      ) : null}
    </ScreenContainer>
  );
}

/**
 * Main SleepScreen entry point. Renders the lock card for free / guest users
 * and the full optimizer for premium users.
 */
export default function SleepScreen() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return <LockedSleepView />;
  }

  return <SleepOptimizer />;
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
  // --- Lock card ---
  lockCard: {
    backgroundColor: colors.surface,
    borderColor: colors.premium,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  lockAccentBar: {
    backgroundColor: colors.premium,
    height: 6,
    width: '100%',
  },
  lockContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  lockTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockText: {
    ...typography.label,
    color: colors.premium,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  lockSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  lockCta: {
    marginTop: spacing.lg,
  },
  // --- Mode toggle ---
  modeToggle: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modeOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.md,
  },
  modeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  modeTextActive: {
    color: colors.white,
  },
  // --- Time picker ---
  timePickerContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  timePickerLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  // --- Suggestion cards ---
  sectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTime: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  qualityBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  qualityBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cardButton: {
    marginTop: spacing.md,
  },
  // --- Timeline ---
  timelineContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  timelineTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelineBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timelineSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallAsleepSegment: {
    backgroundColor: colors.border,
    width: 24,
  },
  cycleSegment: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 4,
  },
  wakeSegment: {
    backgroundColor: colors.primary,
    width: 24,
  },
  cycleSegmentText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentEmoji: {
    fontSize: 16,
  },
  timelineLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: 4,
    height: 12,
    width: 12,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  timelineNote: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.md,
  },
});
