import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  calculateAttendanceDay,
  getAttendanceStateLabel,
  type AttendanceRecord as EngineAttendanceRecord,
  type AttendanceSchedule,
} from "@/lib/attendance/engine";

import {
  getCompanyScheduleHistory,
  getDefaultAttendanceSchedule,
  getEmployeeShiftAssignments,
  resolveEmployeeSchedule,
} from "@/lib/attendance/schedule-resolver";

import {
  getDateKey,
  getTodayRange,
} from "@/lib/date/tehran";

import {
  checkInForUser,
  checkOutForUser,
} from "@/lib/employee/attendance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_SECRET_LENGTH = 32;

type AttendanceActionRequest = {
  action?: unknown;
  userId?: unknown;
};

function jsonResponse(
  data: unknown,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function isAuthorized(
  request: Request,
  expectedSecret: string,
): boolean {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return false;
  }

  const providedSecret =
    authorization.slice("Bearer ".length);

  if (!providedSecret) {
    return false;
  }

  const providedBuffer =
    Buffer.from(providedSecret, "utf8");

  const expectedBuffer =
    Buffer.from(expectedSecret, "utf8");

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    expectedBuffer,
  );
}

function getIntegrationSecret(): string | null {
  const secret =
    process.env.HOZORINO_INTEGRATION_SECRET;

  if (
    !secret ||
    secret.length < MIN_SECRET_LENGTH
  ) {
    return null;
  }

  return secret;
}

function revalidateAttendancePaths() {
  revalidatePath("/employee");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/[userId]", "page");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/reports");
}

/**
 * دریافت وضعیت حضور امروز کارمند.
 *
 * این بخش منطق قبلی GET را حفظ می‌کند.
 */
export async function GET(
  request: Request,
) {
  const integrationSecret =
    getIntegrationSecret();

  if (!integrationSecret) {
    console.error(
      "Hozorino attendance integration secret is missing or too short.",
    );

    return jsonResponse(
      {
        success: false,
        message:
          "ارتباط بین سامانه‌ها هنوز پیکربندی نشده است.",
      },
      503,
    );
  }

  if (
    !isAuthorized(
      request,
      integrationSecret,
    )
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "اجازه دسترسی به این سرویس را ندارید.",
      },
      401,
    );
  }

  const url = new URL(request.url);

  const userId =
    url.searchParams.get("userId")?.trim();

  if (
    !userId ||
    userId.length > 100
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "شناسه کارمند معتبر نیست.",
      },
      400,
    );
  }

  try {
    const user =
      await prisma.user.findFirst({
        where: {
          id: userId,
          role: "EMPLOYEE",
          isActive: true,
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

    if (!user) {
      return jsonResponse(
        {
          success: false,
          message:
            "کارمند فعال موردنظر در حضورینو پیدا نشد.",
        },
        404,
      );
    }

    const {
      start,
      end,
    } = getTodayRange();

    const [
      todayAttendance,
      settings,
      todayHoliday,
      todayLeave,
      shiftAssignments,
      companyScheduleHistory,
    ] = await Promise.all([
      prisma.attendance.findUnique({
        where: {
          userId_workDate: {
            userId: user.id,
            workDate: start,
          },
        },

        include: {
          temporaryExits: {
            orderBy: {
              startedAt: "asc",
            },

            select: {
              id: true,
              type: true,
              status: true,
              startedAt: true,
              endedAt: true,
              reason: true,
              note: true,
            },
          },
        },
      }),

      prisma.companySettings.findUnique({
        where: {
          id: "company",
        },
      }),

      prisma.holiday.findUnique({
        where: {
          date: start,
        },

        select: {
          title: true,
          description: true,
        },
      }),

      prisma.leave.findFirst({
        where: {
          userId: user.id,
          status: "APPROVED",

          startDate: {
            lt: end,
          },

          endDate: {
            gte: start,
          },
        },

        orderBy: {
          startDate: "asc",
        },

        select: {
          type: true,
          reason: true,
        },
      }),

      getEmployeeShiftAssignments({
        userIds: [user.id],
        from: start,
        to: end,
      }),

      getCompanyScheduleHistory({
        from: start,
        to: end,
      }),
    ]);

    const fallbackSchedule:
      AttendanceSchedule =
      getDefaultAttendanceSchedule(
        settings,
      );

    const schedule =
      resolveEmployeeSchedule({
        assignments: shiftAssignments,
        userId: user.id,
        workDate: start,
        fallbackSchedule,
        companyScheduleHistory,
        currentCompanySettings: settings,
      });

    const engineAttendance:
      EngineAttendanceRecord | null =
      todayAttendance
        ? {
            workDate:
              todayAttendance.workDate,

            checkIn:
              todayAttendance.checkIn,

            checkOut:
              todayAttendance.checkOut,

            status:
              todayAttendance.status,

            note:
              todayAttendance.note,

            temporaryExits:
              todayAttendance.temporaryExits.map(
                (exit) => ({
                  type: exit.type,
                  status: exit.status,
                  startedAt: exit.startedAt,
                  endedAt: exit.endedAt,
                }),
              ),
          }
        : null;

    const calculation =
      calculateAttendanceDay({
        workDate: start,
        schedule,

        holiday: todayHoliday
          ? {
              title: todayHoliday.title,
              description:
                todayHoliday.description,
            }
          : null,

        attendance: engineAttendance,
      });

    const isLeaveDay =
      Boolean(
        todayLeave &&
          !todayAttendance &&
          calculation.isWorkingDay &&
          !calculation.isHoliday &&
          !calculation.isFuture,
      );

    const state =
      isLeaveDay
        ? "LEAVE"
        : calculation.state;

    return jsonResponse({
      success: true,

      employee: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      },

      attendance: {
        workDate: getDateKey(start),

        state,
        stateLabel:
          getAttendanceStateLabel(state),

        isWorkingDay:
          calculation.isWorkingDay,

        isHoliday:
          calculation.isHoliday,

        isLeave:
          isLeaveDay,

        isFuture:
          calculation.isFuture,

        scheduledStartMinutes:
          calculation.scheduledStartMinutes,

        scheduledEndMinutes:
          calculation.scheduledEndMinutes,

        scheduledMinutes:
          isLeaveDay
            ? 0
            : calculation.scheduledMinutes,

        checkIn:
          isLeaveDay
            ? null
            : calculation.checkIn?.toISOString() ??
              null,

        checkOut:
          isLeaveDay
            ? null
            : calculation.checkOut?.toISOString() ??
              null,

        workedMinutes:
          isLeaveDay
            ? 0
            : calculation.workedMinutes,

        temporaryExitMinutes:
          isLeaveDay
            ? 0
            : calculation.temporaryExitMinutes,

        lateMinutes:
          isLeaveDay
            ? 0
            : calculation.lateMinutes,

        earlyLeaveMinutes:
          isLeaveDay
            ? 0
            : calculation.earlyLeaveMinutes,

        overtimeMinutes:
          isLeaveDay
            ? 0
            : calculation.overtimeMinutes,

        underworkMinutes:
          isLeaveDay
            ? 0
            : calculation.underworkMinutes,

        balanceMinutes:
          isLeaveDay
            ? 0
            : calculation.balanceMinutes,

        hasAttendance:
          isLeaveDay
            ? false
            : calculation.hasAttendance,

        isComplete:
          isLeaveDay
            ? false
            : calculation.isComplete,

        attendanceStatus:
          isLeaveDay
            ? null
            : calculation.attendanceStatus,

        note:
          isLeaveDay
            ? null
            : calculation.note,

        holiday: todayHoliday
          ? {
              title: todayHoliday.title,
              description:
                todayHoliday.description,
            }
          : null,

        leave:
          isLeaveDay && todayLeave
            ? {
                type: todayLeave.type,
                reason: todayLeave.reason,
              }
            : null,

        temporaryExits:
          isLeaveDay
            ? []
            : (todayAttendance?.temporaryExits ?? []).map(
                (exit) => ({
                  id: exit.id,
                  type: exit.type,
                  status: exit.status,
                  startedAt:
                    exit.startedAt.toISOString(),
                  endedAt:
                    exit.endedAt?.toISOString() ??
                    null,
                  reason: exit.reason,
                  note: exit.note,
                }),
              ),
      },
    });
  } catch (error) {
    console.error(
      "Hozorino attendance integration API error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message:
          "دریافت وضعیت حضور امروز انجام نشد.",
      },
      500,
    );
  }
}

/**
 * ثبت ورود یا خروج نهایی از طریق سامانه فرتاک.
 *
 * درخواست باید با کلید محرمانه بین دو سامانه
 * احراز هویت شود. شناسه کارمند از بدنه درخواست
 * دریافت می‌شود و سرویس مشترک حضورینو، فعال بودن
 * حساب و قوانین ثبت را بررسی می‌کند.
 */
export async function POST(
  request: Request,
) {
  const integrationSecret =
    getIntegrationSecret();

  if (!integrationSecret) {
    console.error(
      "Hozorino attendance integration secret is missing or too short.",
    );

    return jsonResponse(
      {
        success: false,
        message:
          "ارتباط بین سامانه‌ها هنوز پیکربندی نشده است.",
      },
      503,
    );
  }

  if (
    !isAuthorized(
      request,
      integrationSecret,
    )
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "اجازه دسترسی به این سرویس را ندارید.",
      },
      401,
    );
  }

  let payload: AttendanceActionRequest;

  try {
    const body: unknown =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "ساختار درخواست معتبر نیست.",
        },
        400,
      );
    }

    payload = body as AttendanceActionRequest;
  } catch {
    return jsonResponse(
      {
        success: false,
        message:
          "بدنه درخواست معتبر نیست.",
      },
      400,
    );
  }

  const userId =
    typeof payload.userId === "string"
      ? payload.userId.trim()
      : "";

  const action = payload.action;

  if (
    !userId ||
    userId.length > 100
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "شناسه کارمند معتبر نیست.",
      },
      400,
    );
  }

  if (
    action !== "checkIn" &&
    action !== "checkOut"
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "نوع عملیات حضور و غیاب معتبر نیست.",
      },
      400,
    );
  }

  try {
    const result =
      action === "checkIn"
        ? await checkInForUser(userId)
        : await checkOutForUser(userId);

    if (result.success) {
      revalidateAttendancePaths();
    }

    /*
     * خطاهای تجاری مانند ورود تکراری یا تلاش
     * برای خروج قبل از ورود، نتیجه معتبر عملیات
     * هستند؛ بنابراین همراه پیام فارسی برگردانده
     * می‌شوند تا فرتاک بتواند آن را به کارمند نشان دهد.
     */
    return jsonResponse(result);
  } catch (error) {
    console.error(
      "Hozorino attendance integration action error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message:
          "عملیات حضور و غیاب انجام نشد. دوباره تلاش کنید.",
      },
      500,
    );
  }
}