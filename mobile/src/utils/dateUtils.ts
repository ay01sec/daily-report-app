import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type DateInput = Date | FirebaseFirestoreTypes.Timestamp | string | number | null | undefined;

/**
 * 様々な日付形式をDateオブジェクトに変換
 * @param date - 変換対象（Date, Timestamp, string, number, null, undefined）
 * @returns Date オブジェクト、または null
 */
export function toDate(date: DateInput): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  // Firestore Timestamp
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  // Unix timestamp (number)
  if (typeof date === 'number') {
    // ミリ秒か秒かを判定（1970年から50年以上経過していればミリ秒と判断）
    return date > 1e12 ? new Date(date) : new Date(date * 1000);
  }
  // ISO文字列などの文字列
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * 様々な日付形式をFirestore Timestampに変換
 * @param date - 変換対象
 * @returns Firestore Timestamp、または null
 */
export function toTimestamp(date: DateInput): FirebaseFirestoreTypes.Timestamp | null {
  const d = toDate(date);
  if (!d) return null;
  return firestore.Timestamp.fromDate(d);
}

export function formatDate(date: DateInput, formatStr: string = 'yyyy年M月d日'): string {
  const d = toDate(date);
  if (!d) return '';
  return format(d, formatStr, { locale: ja });
}

export function formatDateWithDay(date: DateInput): string {
  return formatDate(date, 'M月d日(E)');
}

export function formatDateTime(date: DateInput): string {
  return formatDate(date, 'yyyy/MM/dd HH:mm');
}

export function formatTime(date: DateInput): string {
  return formatDate(date, 'HH:mm');
}

export function toDateInputValue(date: DateInput): string {
  const d = toDate(date);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

export function fromDateInputValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
}
