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

export function addVietnamDays(days, date = new Date()) {
  return getVietnamDate(new Date(date.getTime() + days * 86_400_000));
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

// Cả suất xế lẫn suất đêm cùng dùng một cơ chế cuộn ngày: ngày X có thể
// đăng ký/sửa từ trước đó, khóa đúng giờ chốt (REGISTRATION_CUTOFF) của
// chính ngày X. Vì vậy "ngày đang mở" tại một thời điểm bất kỳ là: hôm
// nay nếu chưa qua giờ khóa của hôm nay; hôm sau nếu đã qua (khi đó cửa
// sổ của hôm nay đã chốt và trưởng nhóm có thể đăng ký trước cho ngày kế
// tiếp). Không có trạng thái "khóa cứng không làm gì được" — luôn có một
// ngày đang mở để nhập.
export function getActiveRegistrationDate(date = new Date()) {
  const cutoff = getCutoff();
  const p = vietnamParts(date);
  const nowMinutes = Number(p.hour) * 60 + Number(p.minute);
  const isPastCutoff = cutoff ? nowMinutes >= cutoff.minutes : true;
  const targetDate = isPastCutoff ? addVietnamDays(1, date) : getVietnamDate(date);
  return {
    date: targetDate,
    dateLabel: formatVietnamDate(new Date(`${targetDate}T12:00:00Z`)),
  };
}
