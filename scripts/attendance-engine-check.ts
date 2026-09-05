import assert from "node:assert/strict";

import {
    calculateAttendanceDay,
    type AttendanceCalculation,
    type AttendanceSchedule,
  } from "../lib/attendance/engine";

type EngineInput =
  Parameters<
    typeof calculateAttendanceDay
  >[0];

type AttendanceInput =
  NonNullable<
    EngineInput["attendance"]
  >;

type HolidayInput =
  NonNullable<
    EngineInput["holiday"]
  >;

const schedule: AttendanceSchedule = {
  workStartMinutes: 510, // 08:30
  workEndMinutes: 1020, // 17:00

  saturday: false,
  sunday: true,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: false,
};

function dateAtTehranNoon(
  dateKey: string,
): Date {
  return new Date(
    `${dateKey}T12:00:00+03:30`,
  );
}

function attendance(
  workDate: string,
  checkIn: string | null,
  checkOut: string | null,
): AttendanceInput {
  return {
    workDate:
      dateAtTehranNoon(workDate),

    checkIn: checkIn
      ? new Date(checkIn)
      : null,

    checkOut: checkOut
      ? new Date(checkOut)
      : null,

    status:
      checkIn && checkOut
        ? "COMPLETED"
        : "OPEN",

    note: null,
  };
}

function holiday(
    _dateKey: string,
    title = "تعطیلی تست",
  ): HolidayInput {
    return {
      title,
      description: null,
    };
  }

function calculate(
  input: EngineInput,
): AttendanceCalculation {
  return calculateAttendanceDay(
    input,
  );
}

function check(
  name: string,
  fn: () => void,
) {
  try {
    fn();

    console.log(
      `✅ ${name}`,
    );
  } catch (error) {
    console.error(
      `❌ ${name}`,
    );

    throw error;
  }
}

/*
 * 1. ورود و خروج دقیقاً مطابق برنامه
 */
check(
  "حضور کامل بدون تأخیر",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T08:30:00+03:30",
            "2026-09-01T17:00:00+03:30",
          ),
      });

    assert.equal(
      result.state,
      "PRESENT",
    );

    assert.equal(
      result.workedMinutes,
      510,
    );

    assert.equal(
      result.scheduledMinutes,
      510,
    );

    assert.equal(
      result.lateMinutes,
      0,
    );

    assert.equal(
      result.earlyLeaveMinutes,
      0,
    );

    assert.equal(
      result.overtimeMinutes,
      0,
    );

    assert.equal(
      result.underworkMinutes,
      0,
    );

    assert.equal(
      result.balanceMinutes,
      0,
    );
  },
);

/*
 * 2. تأخیر 30 دقیقه
 */
check(
  "ورود با ۳۰ دقیقه تأخیر",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T09:00:00+03:30",
            "2026-09-01T17:00:00+03:30",
          ),
      });

    assert.equal(
      result.state,
      "PRESENT",
    );

    assert.equal(
      result.workedMinutes,
      480,
    );

    assert.equal(
      result.lateMinutes,
      30,
    );

    assert.equal(
      result.earlyLeaveMinutes,
      0,
    );

    assert.equal(
      result.overtimeMinutes,
      0,
    );

    assert.equal(
      result.underworkMinutes,
      30,
    );

    assert.equal(
      result.balanceMinutes,
      -30,
    );
  },
);

/*
 * 3. خروج یک ساعت زودتر
 */
check(
  "خروج ۶۰ دقیقه زودتر",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T08:30:00+03:30",
            "2026-09-01T16:00:00+03:30",
          ),
      });

    assert.equal(
      result.state,
      "PRESENT",
    );

    assert.equal(
      result.workedMinutes,
      450,
    );

    assert.equal(
      result.lateMinutes,
      0,
    );

    assert.equal(
      result.earlyLeaveMinutes,
      60,
    );

    assert.equal(
      result.overtimeMinutes,
      0,
    );

    assert.equal(
      result.underworkMinutes,
      60,
    );

    assert.equal(
      result.balanceMinutes,
      -60,
    );
  },
);

/*
 * 4. یک ساعت اضافه‌کاری
 */
check(
  "یک ساعت اضافه‌کاری",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T08:30:00+03:30",
            "2026-09-01T18:00:00+03:30",
          ),
      });

    assert.equal(
      result.state,
      "PRESENT",
    );

    assert.equal(
      result.workedMinutes,
      570,
    );

    assert.equal(
      result.lateMinutes,
      0,
    );

    assert.equal(
      result.earlyLeaveMinutes,
      0,
    );

    assert.equal(
      result.overtimeMinutes,
      60,
    );

    assert.equal(
      result.underworkMinutes,
      0,
    );

    assert.equal(
      result.balanceMinutes,
      60,
    );
  },
);

/*
 * 5. روز کاری بدون هیچ رکورد
 */
check(
  "غیبت در روز کاری بدون رکورد",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance: null,
      });

    assert.equal(
      result.state,
      "ABSENT",
    );

    assert.equal(
      result.isWorkingDay,
      true,
    );

    assert.equal(
      result.isHoliday,
      false,
    );

    assert.equal(
      result.workedMinutes,
      0,
    );
  },
);

/*
 * 6. رکورد ورود بدون خروج
 */
check(
  "ورود بدون خروج",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday: null,

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T08:30:00+03:30",
            null,
          ),
      });

    assert.equal(
      result.state,
      "WORKING",
    );

    assert.equal(
      result.checkIn !== null,
      true,
    );

    assert.equal(
      result.checkOut,
      null,
    );
  },
);

/*
 * 7. روز تعطیل
 */
check(
  "تعطیلی باید از غیبت جدا باشد",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday:
          holiday(
            "2026-09-01",
            "تعطیلی رسمی",
          ),

        attendance: null,
      });

    assert.equal(
      result.state,
      "HOLIDAY",
    );

    assert.equal(
      result.isHoliday,
      true,
    );

    assert.equal(
      result.isWorkingDay,
      true,
    );

    assert.equal(
      result.holiday?.title,
      "تعطیلی رسمی",
    );
  },
);

/*
 * 8. روز غیرکاری
 *
 * شنبه در schedule غیرفعال است.
 * 2026-09-05 شنبه است و امروز نیز
 * در محیط فعلی پروژه قرار دارد.
 */
check(
  "روز غیرکاری",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-05",
          ),

        schedule,

        holiday: null,

        attendance: null,
      });

    assert.equal(
      result.state,
      "NON_WORKING",
    );

    assert.equal(
      result.isWorkingDay,
      false,
    );

    assert.equal(
      result.isHoliday,
      false,
    );
  },
);

/*
 * 9. تاریخ آینده
 *
 * این تست بررسی می‌کند FUTURE
 * از ABSENT اولویت بالاتری داشته باشد.
 */
check(
  "روز آینده نباید غیبت محسوب شود",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-06",
          ),

        schedule: {
          ...schedule,
          sunday: true,
        },

        holiday: null,

        attendance: null,
      });

    assert.equal(
      result.state,
      "FUTURE",
    );

    assert.equal(
      result.isFuture,
      true,
    );
  },
);

/*
 * 10. تعطیلی با رکورد حضور
 *
 * طبق اولویت فعلی Engine،
 * Holiday باید بر وضعیت attendance
 * غالب باشد.
 */
check(
  "تعطیلی بر رکورد حضور اولویت دارد",
  () => {
    const result =
      calculate({
        workDate:
          dateAtTehranNoon(
            "2026-09-01",
          ),

        schedule,

        holiday:
          holiday(
            "2026-09-01",
            "تعطیلی شرکت",
          ),

        attendance:
          attendance(
            "2026-09-01",
            "2026-09-01T08:30:00+03:30",
            "2026-09-01T17:00:00+03:30",
          ),
      });

    assert.equal(
      result.state,
      "HOLIDAY",
    );

    assert.equal(
      result.isHoliday,
      true,
    );
  },
);

console.log("");
console.log(
  "🎉 تمام تست‌های Attendance Engine با موفقیت عبور کردند.",
);