export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function vietnamParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getVietnamDate(date = new Date()) {
  const p = vietnamParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatVietnamDate(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatVietnamDateFromIso(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ''))) return '';
  const date = new Date(`${isoDate}T12:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return '';
  return formatVietnamDate(date);
}

export function formatVietnamDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export function getCutoff() {
  const raw = process.env.REGISTRATION_CUTOFF?.trim() || '';
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { raw, minutes: hour * 60 + minute };
}

// Đăng ký không còn bị khóa theo giờ — chỉ dùng để đánh dấu "đăng ký
// muộn" khi hiển thị trên dashboard (ghi nhận sau giờ chốt REGISTRATION_CUTOFF
// của chính ngày hôm đó), áp dụng như nhau cho cả suất xế lẫn suất đêm.
export function isTimeAfterCutoff(date = new Date()) {
  const cutoff = getCutoff();
  if (!cutoff) return false;
  const p = vietnamParts(date);
  return Number(p.hour) * 60 + Number(p.minute) >= cutoff.minutes;
}
