import { GROUPS } from './groups';
import { isValidMealType } from './mealTypes';

export function normalizeEmployeeId(value) {
  return String(value ?? '').trim();
}

export function isValidEmployeeId(value) {
  return /^[0-9]{1,20}$/.test(normalizeEmployeeId(value));
}

export function parseQuantity(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function validateRegistration(body) {
  const soDanhBo = normalizeEmployeeId(body?.so_danh_bo);
  const group = String(body?.nhom_phu_trach ?? '').trim();
  const loaiSuat = String(body?.loai_suat ?? '').trim();
  const cnv = parseQuantity(body?.sl_cnv);
  const contractor = parseQuantity(body?.sl_nha_thau);

  if (!isValidEmployeeId(soDanhBo)) return { error: 'Số danh bộ không hợp lệ.' };
  if (!GROUPS.includes(group)) return { error: 'Nhóm phụ trách không hợp lệ.' };
  if (!isValidMealType(loaiSuat)) return { error: 'Loại suất ăn không hợp lệ.' };
  if (cnv === null || contractor === null) return { error: 'Số suất phải là số nguyên không âm.' };
  if (cnv === 0 && contractor === 0) return { error: 'Ít nhất một loại suất ăn phải lớn hơn 0.' };
  return { value: { soDanhBo, group, loaiSuat, cnv, contractor } };
}

export function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
