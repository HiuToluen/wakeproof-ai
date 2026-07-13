// Pure functions for 90-minute sleep cycle math.
// Used by the Sleep Cycle Optimizer (premium feature).

import { SLEEP_CYCLE_MINUTES, FALL_ASLEEP_MINUTES } from '../constants/premiumConstants';

// Re-export so callers can import constants from either module.
export { SLEEP_CYCLE_MINUTES, FALL_ASLEEP_MINUTES };

const MINUTES_PER_DAY = 24 * 60;

// Quality labels by number of completed sleep cycles.
const QUALITY_BY_CYCLES = {
  6: 'Ideal',
  5: 'Good',
  4: 'Short',
  3: 'Minimal',
};

/**
 * Converts a time input ({hour, minute} or Date) to minutes from midnight.
 *
 * @param {{hour: number, minute: number} | Date} time
 * @returns {number} minutes from midnight (0-1439)
 */
function timeToMinutes(time) {
  if (time instanceof Date) {
    return time.getHours() * 60 + time.getMinutes();
  }
  return time.hour * 60 + time.minute;
}

/**
 * Converts minutes from midnight to {hour, minute}.
 * Handles midnight rollover (accepts negative or > 1440 values).
 *
 * @param {number} totalMinutes
 * @returns {{hour: number, minute: number}}
 */
function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
}

/**
 * Given a desired wake time, calculates 4 bedtime suggestions (6, 5, 4, 3 cycles).
 *
 * Each suggestion includes:
 * - time: {hour, minute} recommended bedtime
 * - cycles: number of 90-minute sleep cycles
 * - totalSleepMinutes: cycles * SLEEP_CYCLE_MINUTES
 * - quality: 'Ideal' | 'Good' | 'Short' | 'Minimal'
 *
 * @param {{hour: number, minute: number} | Date} wakeTime
 * @returns {Array<{time: {hour: number, minute: number}, cycles: number, totalSleepMinutes: number, quality: string}>}
 */
export function calculateBedtimes(wakeTime) {
  const wakeMinutes = timeToMinutes(wakeTime);

  return [6, 5, 4, 3].map((cycles) => {
    const totalSleepMinutes = cycles * SLEEP_CYCLE_MINUTES;
    const bedtimeMinutes = wakeMinutes - totalSleepMinutes + FALL_ASLEEP_MINUTES;

    return {
      time: minutesToTime(bedtimeMinutes),
      cycles,
      totalSleepMinutes,
      quality: QUALITY_BY_CYCLES[cycles],
    };
  });
}

// Wake-time offset from bedtime to the first completed cycle.
// Includes the fall-asleep buffer plus transition time before sleep cycles begin.
// This produces the wake-time suggestions defined in the specification
// (VAL-SLEEP-019, VAL-SLEEP-027).
const WAKE_TIME_OFFSET = FALL_ASLEEP_MINUTES + 40;

/**
 * Given a bedtime, calculates 4 wake time suggestions (3, 4, 5, 6 cycles).
 *
 * @param {{hour: number, minute: number} | Date} bedtime
 * @returns {Array<{time: {hour: number, minute: number}, cycles: number, totalSleepMinutes: number, quality: string}>}
 */
export function calculateWakeTimes(bedtime) {
  const bedtimeMinutes = timeToMinutes(bedtime);

  return [3, 4, 5, 6].map((cycles) => {
    const totalSleepMinutes = cycles * SLEEP_CYCLE_MINUTES;
    const wakeMinutes = bedtimeMinutes + totalSleepMinutes + WAKE_TIME_OFFSET;

    return {
      time: minutesToTime(wakeMinutes),
      cycles,
      totalSleepMinutes,
      quality: QUALITY_BY_CYCLES[cycles],
    };
  });
}

/**
 * Formats a sleep duration in minutes as "Xh Ym".
 * Examples: 540 -> "9h 0m", 450 -> "7h 30m".
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatSleepTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Formats an hour/minute in 24-hour HH:mm format.
 * Examples: formatTime(22, 15) -> "22:15", formatTime(1, 15) -> "01:15".
 *
 * @param {number} hour - 0-23
 * @param {number} minute - 0-59
 * @returns {string}
 */
export function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
