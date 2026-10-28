'use client';

import React, { useId, useMemo, useRef, useState, useEffect } from 'react';
import styles from './date-picker.module.css';
import {
  computeCalendarGrid,
  parseDateParts,
  toIsoString,
  toVnString,
  type DateParts,
} from './date-picker-utils';
import { DatePickerCalendar } from './date-picker-calendar';

export interface DatePickerProps {
  name?: string | undefined;
  id?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  hasError?: boolean | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  ariaDescribedby?: string | undefined;
  ariaLabelledby?: string | undefined;
  ariaLabel?: string | undefined;
  onChange?: ((isoDate: string) => void) | undefined;
}

export function DatePicker({
  name,
  id,
  value,
  defaultValue,
  min,
  max,
  placeholder = 'dd/mm/yyyy',
  required,
  disabled,
  hasError,
  className,
  style,
  ariaDescribedby,
  ariaLabelledby,
  ariaLabel,
  onChange,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? `hy-date-input-${generatedId}`;
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = value !== undefined;

  const [uncontrolledIso, setUncontrolledIso] = useState<string>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    return parts ? toIsoString(parts) : '';
  });
  const [uncontrolledDisplay, setUncontrolledDisplay] = useState<string>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    return parts ? toVnString(parts) : '';
  });
  const [isOpen, setIsOpen] = useState(false);

  const controlledParts = isControlled ? parseDateParts(value) : null;
  const selectedIso = isControlled
    ? (controlledParts ? toIsoString(controlledParts) : '')
    : uncontrolledIso;
  const displayValue = isControlled
    ? (controlledParts ? toVnString(controlledParts) : (value ?? ''))
    : uncontrolledDisplay;

  // View year and month for calendar navigation
  const [viewYear, setViewYear] = useState<number>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    if (parts) return parts.year;
    const minParts = parseDateParts(min);
    if (minParts) return minParts.year;
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    if (parts) return parts.month - 1; // 0-indexed
    const minParts = parseDateParts(min);
    if (minParts) return minParts.month - 1;
    return new Date().getMonth();
  });

  const [prevControlledValue, setPrevControlledValue] = useState(value);
  if (isControlled && value !== prevControlledValue) {
    setPrevControlledValue(value);
    if (controlledParts) {
      setViewYear(controlledParts.year);
      setViewMonth(controlledParts.month - 1);
    }
  }

  // Handle outside click to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const parts: DateParts = { year: viewYear, month: viewMonth + 1, day };
    const iso = toIsoString(parts);
    if (!isControlled) {
      setUncontrolledIso(iso);
      setUncontrolledDisplay(toVnString(parts));
    }
    onChange?.(iso);
    setIsOpen(false);
  };

  const handleClear = () => {
    if (!isControlled) {
      setUncontrolledIso('');
      setUncontrolledDisplay('');
    }
    onChange?.('');
    setIsOpen(false);
  };

  // User typing support
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    inputVal = inputVal.replace(/[^\d/-]/g, '');

    // Auto add slashes for pure digits input: 25102026 -> 25/10/2026
    if (!inputVal.includes('/') && !inputVal.includes('-') && inputVal.length > 2) {
      if (inputVal.length <= 4) {
        inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2)}`;
      } else {
        inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2, 4)}/${inputVal.slice(4, 8)}`;
      }
    }

    if (!isControlled) {
      setUncontrolledDisplay(inputVal);
    }

    const parts = parseDateParts(inputVal);
    if (parts) {
      const iso = toIsoString(parts);
      if (!isControlled) {
        setUncontrolledIso(iso);
      }
      setViewYear(parts.year);
      setViewMonth(parts.month - 1);
      onChange?.(iso);
    } else if (inputVal === '') {
      if (!isControlled) {
        setUncontrolledIso('');
      }
      onChange?.('');
    }
  };

  const handleBlur = () => {
    if (!displayValue.trim()) {
      if (!isControlled) {
        setUncontrolledIso('');
        setUncontrolledDisplay('');
      }
      onChange?.('');
      return;
    }
    const parts = parseDateParts(displayValue);
    if (parts) {
      const iso = toIsoString(parts);
      if (!isControlled) {
        setUncontrolledIso(iso);
        setUncontrolledDisplay(toVnString(parts));
      }
      onChange?.(iso);
    } else if (selectedIso) {
      const prevParts = parseDateParts(selectedIso);
      if (!isControlled) {
        setUncontrolledDisplay(prevParts ? toVnString(prevParts) : '');
      }
    } else {
      if (!isControlled) {
        setUncontrolledDisplay('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  // Calendar math
  const { emptyCells, dayCells } = useMemo(() => {
    return computeCalendarGrid(viewYear, viewMonth, selectedIso, min, max);
  }, [viewYear, viewMonth, selectedIso, min, max]);

  return (
    <div ref={containerRef} className={`${styles.container} ${className ?? ''}`} style={style}>
      {name ? (
        <input type="hidden" name={name} value={selectedIso} />
      ) : null}

      <div className={styles.trigger}>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`${styles.input} ${isOpen ? styles.isOpen : ''} ${hasError ? styles.hasError : ''}`}
          value={displayValue}
          placeholder={placeholder}
          required={required && !selectedIso}
          disabled={disabled}
          min={min}
          max={max}
          aria-describedby={ariaDescribedby}
          aria-labelledby={ariaLabelledby}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={handleToggle}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          tabIndex={-1}
          aria-label="Chọn ngày từ lịch"
          disabled={disabled}
          className={styles.calendarIconBtn}
          onClick={handleToggle}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <DatePickerCalendar
          viewMonth={viewMonth}
          viewYear={viewYear}
          emptyCells={emptyCells}
          dayCells={dayCells}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectDay={handleDaySelect}
          onClear={handleClear}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
