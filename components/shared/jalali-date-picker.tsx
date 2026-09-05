"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  toGregorian,
  toJalaali,
} from "jalaali-js";
import {
  useMemo,
  useState,
} from "react";

type JalaliDatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  name?: string;
};

type JalaliDate = {
  jy: number;
  jm: number;
  jd: number;
};

const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEK_DAYS = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(
  value: string | number,
): string {
  return String(value).replace(
    /\d/g,
    (digit) =>
      PERSIAN_DIGITS[
        Number(digit)
      ],
  );
}

function isoToJalali(
  value: string,
): JalaliDate | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);

  const result = toJalaali(
    gy,
    gm,
    gd,
  );

  return {
    jy: result.jy,
    jm: result.jm,
    jd: result.jd,
  };
}

function jalaliToIso(
  date: JalaliDate,
): string {
  const result = toGregorian(
    date.jy,
    date.jm,
    date.jd,
  );

  return [
    String(result.gy).padStart(
      4,
      "0",
    ),
    String(result.gm).padStart(
      2,
      "0",
    ),
    String(result.gd).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function getMonthDays(
  year: number,
  month: number,
): number {
  if (month <= 6) {
    return 31;
  }

  if (month <= 11) {
    return 30;
  }

  const nextYear =
    toGregorian(
      year,
      12,
      30,
    );

  if (
    nextYear.gy === year &&
    nextYear.gm === 12 &&
    nextYear.gd === 30
  ) {
    return 30;
  }

  return 29;
}

function getWeekdayIndex(
  date: JalaliDate,
): number {
  const gregorian =
    toGregorian(
      date.jy,
      date.jm,
      date.jd,
    );

  const dateObject = new Date(
    Date.UTC(
      gregorian.gy,
      gregorian.gm - 1,
      gregorian.gd,
    ),
  );

  const sundayBased =
    dateObject.getUTCDay();

  return (
    (sundayBased + 1) % 7
  );
}

function compareIsoDates(
  first: string,
  second: string,
): number {
  return first.localeCompare(
    second,
  );
}

function getInitialDate(
  value?: string,
): JalaliDate {
  const selected = value
    ? isoToJalali(value)
    : null;

  if (selected) {
    return selected;
  }

  const today =
    toJalaali(new Date());

  return {
    jy: today.jy,
    jm: today.jm,
    jd: today.jd,
  };
}

export default function JalaliDatePicker({
  value = "",
  onChange,
  placeholder = "انتخاب تاریخ",
  min,
  max,
  name,
}: JalaliDatePickerProps) {
  const initialDate = useMemo(
    () => getInitialDate(value),
    [value],
  );

  const selected = useMemo(
    () =>
      value
        ? isoToJalali(value)
        : null,
    [value],
  );

  const today = useMemo(
    () =>
      toJalaali(
        new Date(),
      ),
    [],
  );

  const [open, setOpen] =
    useState(false);

  const [viewYear, setViewYear] =
    useState(initialDate.jy);

  const [viewMonth, setViewMonth] =
    useState(initialDate.jm);

  const monthDays =
    getMonthDays(
      viewYear,
      viewMonth,
    );

  const firstDayIndex =
    getWeekdayIndex({
      jy: viewYear,
      jm: viewMonth,
      jd: 1,
    });

  const cells: Array<
    number | null
  > = Array.from(
    {
      length:
        firstDayIndex +
        monthDays,
    },
    (_, index) => {
      if (
        index <
        firstDayIndex
      ) {
        return null;
      }

      return (
        index -
        firstDayIndex +
        1
      );
    },
  );

  function previousMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(
        (current) =>
          current - 1,
      );
      return;
    }

    setViewMonth(
      (current) =>
        current - 1,
    );
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(
        (current) =>
          current + 1,
      );
      return;
    }

    setViewMonth(
      (current) =>
        current + 1,
    );
  }

  function isDisabled(
    iso: string,
  ): boolean {
    if (
      min &&
      compareIsoDates(
        iso,
        min,
      ) < 0
    ) {
      return true;
    }

    if (
      max &&
      compareIsoDates(
        iso,
        max,
      ) > 0
    ) {
      return true;
    }

    return false;
  }

  function updateUrl(
    fieldName: string,
    fieldValue: string,
  ) {
    const url =
      new URL(
        window.location.href,
      );

    url.searchParams.set(
      fieldName,
      fieldValue,
    );

    window.location.href =
      url.toString();
  }

  function selectDay(
    day: number,
  ) {
    const isoValue =
      jalaliToIso({
        jy: viewYear,
        jm: viewMonth,
        jd: day,
      });

    if (
      isDisabled(isoValue)
    ) {
      return;
    }

    setOpen(false);

    if (onChange) {
      onChange(isoValue);
      return;
    }

    if (name) {
      updateUrl(
        name,
        isoValue,
      );
    }
  }

  function clearDate() {
    setOpen(false);

    if (onChange) {
      onChange("");
      return;
    }

    if (!name) {
      return;
    }

    const url =
      new URL(
        window.location.href,
      );

    url.searchParams.delete(
      name,
    );

    window.location.href =
      url.toString();
  }

  function selectToday() {
    const isoToday =
      jalaliToIso({
        jy: today.jy,
        jm: today.jm,
        jd: today.jd,
      });

    if (isDisabled(isoToday)) {
      return;
    }

    setOpen(false);

    if (onChange) {
      onChange(isoToday);
      return;
    }

    if (name) {
      updateUrl(
        name,
        isoToday,
      );
    }
  }

  const displayValue =
    selected === null
      ? ""
      : `${toPersianDigits(
          selected.jd,
        )} ${
          MONTHS[
            selected.jm - 1
          ]
        } ${toPersianDigits(
          selected.jy,
        )}`;

  return (
    <div
      className="relative"
      dir="rtl"
    >
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value}
          readOnly
        />
      ) : null}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className="
          flex h-12 w-full
          items-center gap-3
          rounded-2xl
          border border-slate-200
          bg-slate-50
          px-4
          text-right
          outline-none
          transition
          hover:bg-white
          focus:border-slate-400
          focus:ring-4
          focus:ring-slate-900/5
        "
        aria-expanded={open}
      >
        <CalendarDays
          size={17}
          className="shrink-0 text-slate-400"
        />

        <span
          className={
            displayValue
              ? "min-w-0 flex-1 truncate text-sm font-medium text-slate-800"
              : "min-w-0 flex-1 truncate text-sm text-slate-400"
          }
        >
          {displayValue ||
            placeholder}
        </span>

        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              clearDate();
            }}
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                event.stopPropagation();
                clearDate();
              }
            }}
            className="
              flex h-7 w-7
              items-center justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-200
              hover:text-slate-700
            "
            aria-label="پاک کردن تاریخ"
          >
            <X size={15} />
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="بستن تقویم"
            onClick={() =>
              setOpen(false)
            }
            className="
              fixed inset-0
              z-30
              cursor-default
            "
          />

          <div
            className="
              absolute
              right-0
              top-[calc(100%+8px)]
              z-40
              w-full
              min-w-[290px]
              overflow-hidden
              rounded-[24px]
              border border-slate-200
              bg-white
              p-4
              shadow-[0_20px_60px_rgba(15,23,42,0.14)]
            "
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={nextMonth}
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-800
                "
                aria-label="ماه بعد"
              >
                <ChevronRight
                  size={18}
                />
              </button>

              <div className="text-center">
                <p className="text-sm font-bold text-slate-950">
                  {MONTHS[
                    viewMonth - 1
                  ]}
                </p>

                <p className="mt-0.5 text-xs font-medium text-slate-400">
                  {toPersianDigits(
                    viewYear,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  previousMonth
                }
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-800
                "
                aria-label="ماه قبل"
              >
                <ChevronLeft
                  size={18}
                />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEK_DAYS.map(
                (day) => (
                  <div
                    key={day}
                    className="
                      flex h-8
                      items-center
                      justify-center
                      text-[10px]
                      font-semibold
                      text-slate-400
                    "
                  >
                    {day}
                  </div>
                ),
              )}

              {cells.map(
                (
                  day,
                  index,
                ) => {
                  if (
                    day === null
                  ) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-10"
                      />
                    );
                  }

                  const iso =
                    jalaliToIso({
                      jy: viewYear,
                      jm: viewMonth,
                      jd: day,
                    });

                  const selectedDay =
                    value === iso;

                  const todayDay =
                    today.jy ===
                      viewYear &&
                    today.jm ===
                      viewMonth &&
                    today.jd ===
                      day;

                  const disabled =
                    isDisabled(
                      iso,
                    );

                  let dayClass =
                    "flex h-10 items-center justify-center rounded-xl text-xs font-semibold transition";

                  if (disabled) {
                    dayClass +=
                      " cursor-not-allowed text-slate-200";
                  } else if (
                    selectedDay
                  ) {
                    dayClass +=
                      " bg-slate-950 text-white";
                  } else if (
                    todayDay
                  ) {
                    dayClass +=
                      " bg-blue-50 text-blue-700";
                  } else {
                    dayClass +=
                      " text-slate-700 hover:bg-slate-100";
                  }

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        selectDay(
                          day,
                        )
                      }
                      className={
                        dayClass
                      }
                    >
                      {toPersianDigits(
                        day,
                      )}
                    </button>
                  );
                },
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={
                  selectToday
                }
                className="
                  text-xs
                  font-semibold
                  text-blue-600
                  transition
                  hover:text-blue-700
                "
              >
                امروز
              </button>

              <button
                type="button"
                onClick={
                  clearDate
                }
                className="
                  text-xs
                  font-semibold
                  text-slate-400
                  transition
                  hover:text-slate-700
                "
              >
                پاک کردن
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}