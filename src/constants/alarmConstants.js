export const ALARM_SESSION_STATUS = {
  QUEUED: 'QUEUED',
  RINGING: 'RINGING',
  SNOOZING: 'SNOOZING',
  CHALLENGE_ACTIVE: 'CHALLENGE_ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const CHALLENGE_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

export const CHALLENGE_MODES = {
  RANDOM: 'RANDOM',
  OBJECT_PROOF: 'OBJECT_PROOF',
  LOCATION_PROOF: 'LOCATION_PROOF',
};

export const RINGTONES = [
  {
    id: 'BRR_BRR_PATAPIM',
    label: 'Brr Brr Patapim',
    fileName: 'brr-brr-patapim-alarm-brainrot-nhacchuongwow.com.mp3',
    source: require('../../assets/musics/brr-brr-patapim-alarm-brainrot-nhacchuongwow.com.mp3'),
  },
  {
    id: 'DREAM_ALARM',
    label: 'Dream Alarm',
    fileName: 'dream-alarm-nhacchuongwow.com.mp3',
    source: require('../../assets/musics/dream-alarm-nhacchuongwow.com.mp3'),
  },
  {
    id: 'ALARM_SIREN',
    label: 'Alarm Siren',
    fileName: 'nhac_chuong_bao_thuc_coi_bao_dong-www_tiengdong_com.mp3',
    source: require('../../assets/musics/nhac_chuong_bao_thuc_coi_bao_dong-www_tiengdong_com.mp3'),
  },
  {
    id: 'LOUD_ALARM',
    label: 'Loud Alarm',
    fileName: 'nhac_chuong_bao_thuc_cuc_to-www_tiengdong_com.mp3',
    source: require('../../assets/musics/nhac_chuong_bao_thuc_cuc_to-www_tiengdong_com.mp3'),
  },
];

export const DEFAULT_RINGTONE_ID = RINGTONES[0].id;

export function getRingtoneById(id) {
  return RINGTONES.find((ringtone) => ringtone.id === id) || RINGTONES[0];
}

export const DAYS = [
  { value: 0, shortLabel: 'S', label: 'Sunday' },
  { value: 1, shortLabel: 'M', label: 'Monday' },
  { value: 2, shortLabel: 'T', label: 'Tuesday' },
  { value: 3, shortLabel: 'W', label: 'Wednesday' },
  { value: 4, shortLabel: 'T', label: 'Thursday' },
  { value: 5, shortLabel: 'F', label: 'Friday' },
  { value: 6, shortLabel: 'S', label: 'Saturday' },
];
