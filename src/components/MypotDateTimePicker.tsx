import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = [0, 10, 20, 30, 40, 50];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseLocalDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

function toLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialDate(value: string) {
  const parsed = parseLocalDateTime(value);
  if (parsed) return parsed;
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil(date.getMinutes() / 10) * 10);
  return date;
}

export function MypotDateTimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => initialDate(value));
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(draft.getFullYear(), draft.getMonth(), 1),
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const firstDay = visibleMonth.getDay();
    const daysInMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0,
    ).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  const selectedMinute = minutes.includes(draft.getMinutes())
    ? draft.getMinutes()
    : Math.round(draft.getMinutes() / 10) * 10 % 60;

  function openPicker() {
    const nextDraft = initialDate(value);
    setDraft(nextDraft);
    setVisibleMonth(new Date(nextDraft.getFullYear(), nextDraft.getMonth(), 1));
    setIsOpen(true);
  }

  function updateTime(type: 'hour' | 'minute', nextValue: number) {
    const next = new Date(draft);
    if (type === 'hour') next.setHours(nextValue);
    else next.setMinutes(nextValue);
    setDraft(next);
  }

  function selectDay(day: number) {
    const next = new Date(draft);
    next.setFullYear(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    setDraft(next);
  }

  return (
    <div className="mypotDateTimeField">
      <span>{label}</span>
      <button
        aria-expanded={isOpen}
        className={`mypotDateTimeTrigger ${value ? 'selected' : ''}`}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
      >
        <CalendarClock aria-hidden="true" size={17} />
        {value
          ? parseLocalDateTime(value)?.toLocaleString('ko-KR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })
          : '날짜와 시간을 선택해 주세요'}
      </button>

      {isOpen ? (
        <div className="mypotDateTimePopover">
          <div className="mypotCalendarHeader">
            <button
              aria-label="이전 달"
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft size={17} />
            </button>
            <strong>
              {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
            </strong>
            <button
              aria-label="다음 달"
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="mypotCalendarWeekdays">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mypotCalendarGrid">
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  className={
                    draft.getFullYear() === visibleMonth.getFullYear() &&
                    draft.getMonth() === visibleMonth.getMonth() &&
                    draft.getDate() === day
                      ? 'selected'
                      : ''
                  }
                  key={`${visibleMonth.toISOString()}-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="mypotTimeControls">
            <strong>시간</strong>
            <label>
              <select
                aria-label={`${label} 시`}
                value={draft.getHours()}
                onChange={(event) => updateTime('hour', Number(event.target.value))}
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {pad(hour)}시
                  </option>
                ))}
              </select>
            </label>
            <span>:</span>
            <label>
              <select
                aria-label={`${label} 분`}
                value={selectedMinute}
                onChange={(event) => updateTime('minute', Number(event.target.value))}
              >
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {pad(minute)}분
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="mypotDateTimeDone"
            type="button"
            onClick={() => {
              const next = new Date(draft);
              next.setMinutes(selectedMinute, 0, 0);
              onChange(toLocalValue(next));
              setIsOpen(false);
            }}
          >
            선택 완료
          </button>
        </div>
      ) : null}
    </div>
  );
}
