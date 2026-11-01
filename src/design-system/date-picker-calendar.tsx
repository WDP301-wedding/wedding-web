import React from 'react';
import { dp } from './date-picker-classes';
import { WEEKDAYS, type CalendarDayCell } from './date-picker-utils';

export interface DatePickerCalendarProps {
  viewMonth: number;
  viewYear: number;
  emptyCells: unknown[];
  dayCells: readonly CalendarDayCell[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export function DatePickerCalendar({
  dayCells,
  emptyCells,
  onClear,
  onClose,
  onNextMonth,
  onPrevMonth,
  onSelectDay,
  viewMonth,
  viewYear,
}: DatePickerCalendarProps) {
  return (
    <div role="dialog" aria-modal="false" aria-label="Chọn ngày" className={dp.popover}>
      <div className={dp.header}>
        <span className={dp.monthTitle}>
          Tháng {viewMonth + 1}/{viewYear}
        </span>
        <div className={dp.navGroup}>
          <button
            type="button"
            aria-label="Tháng trước"
            className={dp.navButton}
            onClick={onPrevMonth}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Tháng sau"
            className={dp.navButton}
            onClick={onNextMonth}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={dp.weekdays}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={dp.weekday}>
            {w}
          </span>
        ))}
      </div>

      <div className={dp.days}>
        {emptyCells.map((_, i) => (
          <div key={`empty-${i}`} className={dp.dayEmpty} />
        ))}
        {dayCells.map((cell) => {
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={cell.isDisabled}
              className={dp.day}
              data-selected={cell.isSelected}
              data-today={cell.isToday}
              onClick={() => onSelectDay(cell.day)}
              aria-label={`${cell.day}/${viewMonth + 1}/${viewYear}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className={dp.legend}>
        <div className={dp.legendItem}>
          <span className={dp.selectedDot} />
          <span>Đã chọn</span>
        </div>
        <div className={dp.legendItem}>
          <span className={dp.disabledText}>12</span>
          <span>Không khả dụng</span>
        </div>
      </div>

      <div className={dp.footer}>
        <button type="button" className={dp.cancel} onClick={onClear}>
          Xoá
        </button>
        <button type="button" className={dp.confirm} onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}
