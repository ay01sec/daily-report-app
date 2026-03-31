import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(date, formatStr = 'yyyy年M月d日') {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
  return format(d, formatStr, { locale: ja });
}

export function formatDateWithDay(date) {
  return formatDate(date, 'M月d日(E)');
}

export function formatDateTime(date) {
  return formatDate(date, 'yyyy/MM/dd HH:mm');
}

export function formatTime(date) {
  return formatDate(date, 'HH:mm');
}

export function toDateInputValue(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
  return format(d, 'yyyy-MM-dd');
}

export function fromDateInputValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  // 正午に設定してタイムゾーンによる日付ずれを防止
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getTodayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
}
