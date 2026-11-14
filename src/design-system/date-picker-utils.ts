export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2150 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseDateParts(val?: string | null): DateParts | null {
  if (!val) return null;
  const trimmed = val.trim();
  // Format YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidDate(year, month, day)) {
      return { year, month, day };
    }
  }
  // Format DD/MM/YYYY
  const vnMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (vnMatch) {
    const day = Number(vnMatch[1]);
    const month = Number(vnMatch[2]);
    const year = Number(vnMatch[3]);
    if (isValidDate(year, month, day)) {
      return { year, month, day };
    }
  }
  return null;
}

/**
 * Định dạng chuỗi người dùng đang gõ thành dd/mm/yyyy, tự chèn dấu "/" sau ngày và sau tháng.
 *
 * Luôn dựng lại từ các chữ số (tối đa 8) thay vì chỉ xử lý lần chèn "/" đầu tiên: trước đây gõ
 * "1212" ra "12/12" rồi các số sau nối mãi vào tháng ("12/122026…"). Gõ "5/" hay "5-" thì ngày
 * một chữ số được thêm số 0 ("05"). Dấu "/" chỉ hiện khi đã có chữ số đứng sau, để phím xoá lùi
 * không bị kẹt ở dấu gạch.
 */
export function maskDateInput(raw: string): string {
  const cleaned = raw.replace(/[^\d/-]/g, '');
  // Dán nguyên ngày dạng ISO (2026-12-20) thì giữ nguyên, parseDateParts hiểu được.
  if (/^\d{4}-/.test(cleaned)) return cleaned.slice(0, 10);
  const segments = cleaned.split(/[/-]/);
  const digits = segments
    .map((segment, index) =>
      index < 2 && index < segments.length - 1 ? segment.padStart(2, '0').slice(0, 2) : segment,
    )
    .join('')
    .slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

export function toIsoString(parts: DateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toVnString(parts: DateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${d}/${m}/${y}`;
}

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export interface CalendarDayCell {
  day: number;
  iso: string;
  isDisabled: boolean;
  isSelected: boolean;
  isToday: boolean;
}

export function computeCalendarGrid(
  viewYear: number,
  viewMonth: number,
  selectedIso: string,
  min?: string,
  max?: string,
): { emptyCells: unknown[]; dayCells: CalendarDayCell[] } {
  // 0 = Monday, 6 = Sunday
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  const todayIso = toIsoString({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  });

  const minIso = min ? (parseDateParts(min) ? toIsoString(parseDateParts(min)!) : min) : null;
  const maxIso = max ? (parseDateParts(max) ? toIsoString(parseDateParts(max)!) : max) : null;

  const days: CalendarDayCell[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const currentIso = toIsoString({ year: viewYear, month: viewMonth + 1, day });
    const isDisabled =
      (minIso !== null && currentIso < minIso) || (maxIso !== null && currentIso > maxIso);
    const isSelected = selectedIso === currentIso;
    const isToday = todayIso === currentIso;

    days.push({
      day,
      iso: currentIso,
      isDisabled,
      isSelected,
      isToday,
    });
  }

  return {
    emptyCells: Array.from({ length: firstDayIndex }),
    dayCells: days,
  };
}
