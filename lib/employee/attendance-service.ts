import "server-only";

import {
  calculateAttendanceDay,
} from "@/lib/attendance/engine";

import {
  getCompanyScheduleHistory,
  getDefaultAttendanceSchedule,
  getEmployeeShiftAssignments,
  resolveEmployeeSchedule,
} from "@/lib/attendance/schedule-resolver";

import { getTodayRange } from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

export type AttendanceServiceResult = {
  success: boolean;
  message: string;
};

function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code ===
      "string"
  );
}

async function isActiveEmployee(
  userId: string,
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      role: "EMPLOYEE",
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return Boolean(user);
}

export async function checkInForUser(
  userId: string,
): Promise<AttendanceServiceResult> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return {
      success: false,
      message: "شناسه کارمند معتبر نیست.",
    };
  }

  try {
    const activeEmployee =
      await isActiveEmployee(normalizedUserId);

    if (!activeEmployee) {
      return {
        success: false,
        message:
          "حساب کارمند در حضورینو فعال نیست.",
      };
    }

    const { start, end } = getTodayRange();

    const [
      existing,
      settings,
      todayHoliday,
      todayLeave,
      shiftAssignments,
      companyScheduleHistory,
    ] = await Promise.all([
      prisma.attendance.findUnique({
        where: {
          userId_workDate: {
            userId: normalizedUserId,
            workDate: start,
          },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
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
          userId: normalizedUserId,
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
        userIds: [normalizedUserId],
        from: start,
        to: end,
      }),

      getCompanyScheduleHistory({
        from: start,
        to: end,
      }),
    ]);

    const fallbackSchedule =
      getDefaultAttendanceSchedule(settings);

    const schedule = resolveEmployeeSchedule({
      assignments: shiftAssignments,
      userId: normalizedUserId,
      workDate: start,
      fallbackSchedule,
      companyScheduleHistory,
      currentCompanySettings: settings,
    });

    const dayCalculation =
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
        attendance: null,
      });

    if (dayCalculation.isHoliday) {
      return {
        success: false,
        message: todayHoliday?.title
          ? `امروز تعطیل است: ${todayHoliday.title}`
          : "امروز تعطیل است و امکان ثبت ورود وجود ندارد.",
      };
    }

    if (!dayCalculation.isWorkingDay) {
      return {
        success: false,
        message:
          "امروز طبق برنامه کاری معتبر شما روز غیرکاری است.",
      };
    }

    if (existing?.checkIn) {
      return {
        success: false,
        message:
          "ورود امروز شما قبلاً ثبت شده است.",
      };
    }

    if (
      existing &&
      !existing.checkIn &&
      existing.checkOut
    ) {
      return {
        success: false,
        message:
          "رکورد حضور امروز وضعیت نامعتبر دارد. لطفاً با مدیر سیستم تماس بگیرید.",
      };
    }

    if (
      todayLeave &&
      !existing?.checkIn &&
      !dayCalculation.isHoliday &&
      !dayCalculation.isFuture
    ) {
      return {
        success: false,
        message:
          "برای امروز مرخصی تأییدشده دارید و امکان ثبت ورود جدید وجود ندارد.",
      };
    }

    if (existing) {
      const result =
        await prisma.attendance.updateMany({
          where: {
            id: existing.id,
            checkIn: null,
            checkOut: null,
          },
          data: {
            checkIn: new Date(),
            status: "OPEN",
          },
        });

      if (result.count === 0) {
        return {
          success: false,
          message:
            "ورود امروز شما قبلاً ثبت شده است.",
        };
      }
    } else {
      try {
        await prisma.attendance.create({
          data: {
            userId: normalizedUserId,
            workDate: start,
            checkIn: new Date(),
            status: "OPEN",
          },
        });
      } catch (error) {
        if (
          isPrismaKnownRequestError(error) &&
          error.code === "P2002"
        ) {
          return {
            success: false,
            message:
              "ورود امروز شما قبلاً ثبت شده است.",
          };
        }

        throw error;
      }
    }

    return {
      success: true,
      message: "ورود شما با موفقیت ثبت شد.",
    };
  } catch (error) {
    console.error(
      "Integrated employee check-in error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت ورود انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function checkOutForUser(
  userId: string,
): Promise<AttendanceServiceResult> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return {
      success: false,
      message: "شناسه کارمند معتبر نیست.",
    };
  }

  try {
    const activeEmployee =
      await isActiveEmployee(normalizedUserId);

    if (!activeEmployee) {
      return {
        success: false,
        message:
          "حساب کارمند در حضورینو فعال نیست.",
      };
    }

    const { start } = getTodayRange();

    const result = await prisma.$transaction(
      async (tx) => {
        const attendance =
          await tx.attendance.findUnique({
            where: {
              userId_workDate: {
                userId: normalizedUserId,
                workDate: start,
              },
            },
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
            },
          });

        if (!attendance?.checkIn) {
          return {
            ok: false as const,
            message:
              "ابتدا باید ورود خود را ثبت کنید.",
          };
        }

        if (attendance.checkOut) {
          return {
            ok: false as const,
            message:
              "خروج امروز شما قبلاً ثبت شده است.",
          };
        }

        /*
         * به‌روزرسانی رکورد حضور در ابتدای تراکنش،
         * برای هماهنگ‌کردن عملیات هم‌زمان.
         */
        await tx.attendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        const openExit =
          await tx.temporaryExit.findFirst({
            where: {
              attendanceId: attendance.id,
              status: "OPEN",
            },
            select: {
              id: true,
            },
          });

        if (openExit) {
          return {
            ok: false as const,
            message:
              "ابتدا باید از خروج موقت یا مأموریت خود بازگردید، سپس خروج نهایی را ثبت کنید.",
          };
        }

        const updated =
          await tx.attendance.updateMany({
            where: {
              id: attendance.id,
              checkIn: {
                not: null,
              },
              checkOut: null,
            },
            data: {
              checkOut: new Date(),
              status: "COMPLETED",
            },
          });

        if (updated.count === 0) {
          return {
            ok: false as const,
            message:
              "خروج امروز شما قبلاً ثبت شده است.",
          };
        }

        return {
          ok: true as const,
          message: "خروج شما با موفقیت ثبت شد.",
        };
      },
    );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error(
      "Integrated employee check-out error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت خروج انجام نشد. دوباره تلاش کنید.",
    };
  }
}