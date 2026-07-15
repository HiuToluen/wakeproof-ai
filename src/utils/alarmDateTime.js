export function calculateAlarmOccurrence(alarm, now = new Date()) {
  const current = new Date(now.getTime());
  const repeatDays = Array.isArray(alarm.repeatDays) ? alarm.repeatDays : [];
  const repeatDaySet = repeatDays.length > 0 ? new Set(repeatDays) : null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(current.getTime());
    candidate.setDate(current.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);
    const allowed = repeatDaySet === null || repeatDaySet.has(candidate.getDay());
    if (allowed && candidate.getTime() > current.getTime()) {
      return candidate;
    }
  }

  const fallback = new Date(current.getTime());
  fallback.setDate(current.getDate() + 1);
  fallback.setHours(alarm.hour, alarm.minute, 0, 0);
  return fallback;
}

export function formatNextTrigger(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}
