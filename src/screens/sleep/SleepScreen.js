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
import { Ionicons } from '@expo/vector-icons';

import TimeInput from '../../components/alarm/TimeInput';
import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { usePremium } from '../../hooks/usePremium';
import { useTheme } from '../../hooks/useTheme';
import {
  calculateBedtimes,
  calculateWakeTimes,
  FALL_ASLEEP_MINUTES,
  formatSleepTime,
  formatTime,
  SLEEP_CYCLE_MINUTES,
} from '../../utils/sleepCycle';

// Mode toggle values.
const MODE_WAKE_AT = 'wake_at'; // "I want to wake at..."
const MODE_SLEEP_AT = 'sleep_at'; // "I want to sleep at..."

// Default target time: 07:00.
const DEFAULT_HOUR = '07';
const DEFAULT_MINUTE = '00';

// Quality badge background colors keyed by quality label. Built from the active
// palette so badges stay legible/distinct in both light and dark themes.
const getQualityColors = (colors) => ({
  Ideal: colors.success,
  Good: colors.info,
  Short: colors.warning,
  Minimal: colors.danger,
});

// A small palette used to visually differentiate cycle segments in the timeline.
// Cycles through four hues so adjacent blocks are always distinguishable.
const getTimelineColors = (colors) => [
  colors.primary,
  colors.info,
  colors.success,
  colors.premium,
];

/**
 * Lock card shown to free users and guests. Features a premium amber accent,
 * a lock icon, explanatory text, and an "Upgrade to Premium" CTA.
 */
function LockedSleepView({ styles, colors }) {
  const navigation = useNavigation();

  // Both free and guest users navigate to the PremiumScreen. For guests the
  // PremiumScreen shows a "Sign in to subscribe" prompt that leads to auth.
  const handleUpgrade = () => {
    navigation.navigate('Premium');
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.heading}>Sleep Cycle</Text>
      <View style={styles.lockCard}>
        <View style={styles.lockAccentBar} />
        <View style={styles.lockContent}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed" size={30} color={colors.premium} />
          </View>
          <Text style={styles.lockTitle}>Sleep Cycle Optimizer</Text>
          <View style={styles.lockPremiumTag}>
            <Ionicons name="star" size={13} color="#1A1200" />
            <Text style={styles.lockPremiumTagText}>Premium feature</Text>
          </View>
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
function SuggestionCard({ suggestion, selected, onSelect, onCreateAlarm, styles, colors }) {
  const qualityColor = getQualityColors(colors)[suggestion.quality] || colors.textSecondary;
  const isIdeal = suggestion.quality === 'Ideal';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        isIdeal && styles.cardIdeal,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {isIdeal ? (
        <View style={styles.recommendedTag}>
          <Ionicons name="sparkles" size={12} color={colors.onPrimary} />
          <Text style={styles.recommendedTagText}>Recommended</Text>
        </View>
      ) : null}
      <View style={styles.cardHeader}>
        <View style={styles.cardTimeRow}>
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={selected ? colors.primary : colors.textTertiary}
          />
          <Text style={styles.cardTime}>
            {formatTime(suggestion.time.hour, suggestion.time.minute)}
          </Text>
        </View>
        <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
          <Text style={styles.qualityBadgeText}>{suggestion.quality}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detailChip}>
          <Ionicons name="refresh" size={14} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>
            {suggestion.cycles} {suggestion.cycles === 1 ? 'cycle' : 'cycles'}
          </Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>
            {formatSleepTime(suggestion.totalSleepMinutes)}
          </Text>
        </View>
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
function SleepTimeline({ suggestion, bedLabel, wakeLabel, styles, colors }) {
  const { cycles } = suggestion;
  const timelineColors = getTimelineColors(colors);

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.timelineTitle}>
        Sleep Timeline · {cycles} {cycles === 1 ? 'cycle' : 'cycles'}
      </Text>
      <View style={styles.timelineBar}>
        {/* Fall-asleep buffer segment */}
        <View style={[styles.timelineSegment, styles.fallAsleepSegment]}>
          <Ionicons name="moon" size={14} color={colors.textSecondary} />
        </View>
        {/* One colored block per sleep cycle */}
        {Array.from({ length: cycles }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.timelineSegment,
              styles.cycleSegment,
              { backgroundColor: timelineColors[index % timelineColors.length] },
            ]}
          >
            <Text style={styles.cycleSegmentText}>{index + 1}</Text>
          </View>
        ))}
        {/* Wake marker */}
        <View style={[styles.timelineSegment, styles.wakeSegment]}>
          <Ionicons name="alarm" size={14} color={colors.onPrimary} />
        </View>
      </View>
      {/* Bedtime / wake-time endpoint labels under the bar */}
      <View style={styles.timelineEndpoints}>
        <View style={styles.endpoint}>
          <Text style={styles.endpointLabel}>Bedtime</Text>
          <Text style={styles.endpointTime}>{bedLabel}</Text>
        </View>
        <View style={[styles.endpoint, styles.endpointRight]}>
          <Text style={styles.endpointLabel}>Wake</Text>
          <Text style={styles.endpointTime}>{wakeLabel}</Text>
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
function SleepOptimizer({ styles, colors }) {
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

      {/* Mode toggle — segmented control */}
      <View style={styles.modeToggle}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === MODE_WAKE_AT }}
          onPress={() => handleModeChange(MODE_WAKE_AT)}
          style={[styles.modeOption, mode === MODE_WAKE_AT && styles.modeOptionActive]}
        >
          <Ionicons
            name="sunny-outline"
            size={16}
            color={mode === MODE_WAKE_AT ? colors.onPrimary : colors.textSecondary}
          />
          <Text style={[styles.modeText, mode === MODE_WAKE_AT && styles.modeTextActive]}>
            Wake at
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === MODE_SLEEP_AT }}
          onPress={() => handleModeChange(MODE_SLEEP_AT)}
          style={[styles.modeOption, mode === MODE_SLEEP_AT && styles.modeOptionActive]}
        >
          <Ionicons
            name="moon-outline"
            size={16}
            color={mode === MODE_SLEEP_AT ? colors.onPrimary : colors.textSecondary}
          />
          <Text style={[styles.modeText, mode === MODE_SLEEP_AT && styles.modeTextActive]}>
            Sleep at
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
            styles={styles}
            colors={colors}
          />
        ))}
      </View>

      {/* Timeline visualization for the selected suggestion. In "wake at" mode
          the suggestion time is the bedtime and the entered time is the wake
          time; in "sleep at" mode it is reversed. */}
      {selectedSuggestion ? (
        <SleepTimeline
          suggestion={selectedSuggestion}
          bedLabel={mode === MODE_WAKE_AT
            ? formatTime(selectedSuggestion.time.hour, selectedSuggestion.time.minute)
            : formatTime(Number(hour) || 0, Number(minute) || 0)}
          wakeLabel={mode === MODE_WAKE_AT
            ? formatTime(Number(hour) || 0, Number(minute) || 0)
            : formatTime(selectedSuggestion.time.hour, selectedSuggestion.time.minute)}
          styles={styles}
          colors={colors}
        />
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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!isPremium) {
    return <LockedSleepView styles={styles} colors={theme.colors} />;
  }

  return <SleepOptimizer styles={styles} colors={theme.colors} />;
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
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
    borderRadius: radius.lg,
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
  lockIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  lockTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockPremiumTag: {
    alignItems: 'center',
    backgroundColor: colors.premium,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lockPremiumTagText: {
    color: '#1A1200',
    fontSize: 12,
    fontWeight: '700',
  },
  lockSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  lockCta: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  // --- Mode toggle (segmented control) ---
  modeToggle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  modeOption: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  modeOptionActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  modeTextActive: {
    color: colors.onPrimary,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  // Highlighted "Ideal" suggestion: amber accent border + tinted surface.
  cardIdeal: {
    borderColor: colors.premium,
    backgroundColor: colors.surfaceAlt,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  recommendedTag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.premium,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedTagText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardTime: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  qualityBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  qualityBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  detailChip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
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
    borderRadius: radius.lg,
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
    borderRadius: radius.sm,
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineEndpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  endpoint: {
    alignItems: 'flex-start',
  },
  endpointRight: {
    alignItems: 'flex-end',
  },
  endpointLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  endpointTime: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: 2,
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
