import { DAYS } from '../constants/alarmConstants';

export function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getRepeatDaysSummary(repeatDays) {
  const uniqueDays = [...new Set(repeatDays)].sort((first, second) => first - second);

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
    .map((value) => DAYS.find((day) => day.value === value)?.label.slice(0, 3))
    .filter(Boolean)
    .join(', ');
}
