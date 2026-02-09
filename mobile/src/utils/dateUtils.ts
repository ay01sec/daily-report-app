import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

type DateInput = Date | Timestamp | string | null | undefined;

function toDate(date: DateInput): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'object' && 'toDate' in date) return date.toDate();
  return new Date(date);
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
