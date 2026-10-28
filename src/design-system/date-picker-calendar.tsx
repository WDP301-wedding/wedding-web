import React from 'react';
import styles from './date-picker.module.css';
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
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Chọn ngày"
      className={styles.popover}
    >
      <div className={styles.header}>
        <span className={styles.monthTitle}>
          Tháng {viewMonth + 1}/{viewYear}
        </span>
        <div className={styles.navGroup}>
          <button
            type="button"
            aria-label="Tháng trước"
            className={styles.navBtn}
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
            className={styles.navBtn}
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

      <div className={styles.weekdaysGrid}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {emptyCells.map((_, i) => (
          <div key={`empty-${i}`} className={styles.dayEmpty} />
        ))}
        {dayCells.map((cell) => {
          const classNames = [styles.dayBtn];
          if (cell.isSelected) classNames.push(styles.selectedDay);
          if (cell.isToday) classNames.push(styles.todayDay);
          if (cell.isDisabled) classNames.push(styles.disabledDay);

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={cell.isDisabled}
              className={classNames.join(' ')}
              onClick={() => onSelectDay(cell.day)}
              aria-label={`${cell.day}/${viewMonth + 1}/${viewYear}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.selectedDot} />
          <span>Đã chọn</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.disabledText}>12</span>
          <span>Không khả dụng</span>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onClear}
        >
          Xoá
        </button>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
