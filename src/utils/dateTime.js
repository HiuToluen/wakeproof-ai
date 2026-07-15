import { DAYS } from '../constants/alarmConstants';

const DAY_ABBREVIATIONS_BY_VALUE = new Map(DAYS.map((day) => [day.value, day.label.slice(0, 3)]));

export function normalizeRepeatDays(repeatDays) {
  return [...new Set(Array.isArray(repeatDays) ? repeatDays : [])].sort((first, second) => first - second);
}

export function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getRepeatDaysSummary(repeatDays) {
  const uniqueDays = normalizeRepeatDays(repeatDays);

  if (uniqueDays.length === 0) {
    return 'Once';
  }
  if (uniqueDays.length === 7) {
    return 'Every day';
  }
  if (uniqueDays.join(',') === '1,2,3,4,5') {
    return 'Weekdays';
  }
  if (uniqueDays.join(',') === '0,6') {
    return 'Weekends';
  }

  return uniqueDays
    .map((value) => DAY_ABBREVIATIONS_BY_VALUE.get(value))
    .filter(Boolean)
    .join(', ');
}
