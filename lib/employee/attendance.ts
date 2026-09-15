"use server";

import { revalidatePath } from "next/cache";

import {
  requireEmployee,
} from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceSchedule,
} from "@/lib/attendance/engine";

import { getTodayRange } from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

export type AttendanceActionState = {
  success: boolean;
  message: string;
};

export type TemporaryExitActionState = {
  success: boolean;
  message: string;
};

const emptyState: AttendanceActionState = {
  success: false,
  message: "",
};

const temporaryExitEmptyState: TemporaryExitActionState = {
  success: false,
  message: "",
};

const DEFAULT_SCHEDULE: AttendanceSchedule = {
  workStartMinutes: 510,
  workEndMinutes: 1020,

  saturday: true,
  sunday: true,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: false,
};

function isPrismaKnownRequestError(
  error: unknown,
): error is {
  code: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (
      error as {
        code?: unknown;
      }
    ).code === "string"
  );
}

function parseTemporaryExitType(
  value: string,
): "TEMPORARY" | "MISSION" | null {
  if (
    value === "TEMPORARY" ||
    value === "MISSION"
  ) {
    return value;
  }

  return null;
}

function normalizeOptionalText(
  value: FormDataEntryValue | null | undefined,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength,
  );
}

export async function checkIn(
  _previousState: AttendanceActionState = emptyState,
  _formData?: FormData,
): Promise<AttendanceActionState> {
  const user =
    await requireEmployee();

  const { start, end } =
    getTodayRange();

  try {
    const [
      existing,
      settings,
      todayHoliday,
    ] = await Promise.all([
      prisma.attendance.findUnique({
        where: {
          userId_workDate: {
            userId: user.id,
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
    ]);

    const schedule =
      settings ?? DEFAULT_SCHEDULE;

    const dayCalculation =
      calculateAttendanceDay({
        workDate: start,
        schedule,
        holiday:
          todayHoliday
            ? {
                title:
                  todayHoliday.title,
                description:
                  todayHoliday.description,
              }
            : null,
        attendance: null,
      });

    if (
      dayCalculation.state ===
      "HOLIDAY"
    ) {
      return {
        success: false,
        message:
          todayHoliday?.title
            ? `امروز تعطیل است: ${todayHoliday.title}`
            : "امروز تعطیل است و امکان ثبت ورود وجود ندارد.",
      };
    }

    if (
      dayCalculation.state ===
      "NON_WORKING"
    ) {
      return {
        success: false,
        message:
          "امروز طبق برنامه کاری شرکت روز غیرکاری است.",
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
            userId: user.id,
            workDate: start,
            checkIn: new Date(),
            status: "OPEN",
          },
        });
      } catch (error) {
        if (
          isPrismaKnownRequestError(
            error,
          ) &&
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

    revalidatePath("/employee");
    revalidatePath("/admin");
    revalidatePath("/admin/attendance");
    revalidatePath(
      "/admin/attendance/[userId]",
    );
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message:
        "ورود شما با موفقیت ثبت شد.",
    };
  } catch (error) {
    console.error(
      "Employee check-in error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت ورود انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function startTemporaryExit(
  _previousState: TemporaryExitActionState = temporaryExitEmptyState,
  formData?: FormData,
): Promise<TemporaryExitActionState> {
  const user =
    await requireEmployee();

  const { start } =
    getTodayRange();

  try {
    const type =
      parseTemporaryExitType(
        String(
          formData?.get("type") ??
            "",
        ),
      );

    if (!type) {
      return {
        success: false,
        message:
          "نوع خروج را انتخاب کنید.",
      };
    }

    const reason =
      normalizeOptionalText(
        formData?.get("reason"),
        500,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const attendance =
            await tx.attendance.findUnique({
              where: {
                userId_workDate: {
                  userId: user.id,
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
                "حضور امروز شما قبلاً با خروج نهایی بسته شده است.",
            };
          }

          /*
           * با تغییر رکورد Attendance در ابتدای تراکنش،
           * ردیف همان روز قفل می‌شود و دو درخواست
           * همزمان نمی‌توانند برای یک کارمند، دو
           * خروج باز ایجاد کنند.
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
                attendanceId:
                  attendance.id,
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
                "در حال حاضر یک خروج باز دارید. ابتدا باید بازگشت خود را ثبت کنید.",
            };
          }

          const temporaryExit =
            await tx.temporaryExit.create({
              data: {
                userId: user.id,
                attendanceId:
                  attendance.id,
                type,
                status: "OPEN",
                startedAt:
                  new Date(),
                reason,
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
            });

          await tx.temporaryExitAudit.create({
            data: {
              temporaryExitId:
                temporaryExit.id,

              actorId:
                user.id,

              action: "CREATE",

              previousType:
                null,

              previousStatus:
                null,

              previousStartedAt:
                null,

              previousEndedAt:
                null,

              previousReason:
                null,

              previousNote:
                null,

              newType:
                temporaryExit.type,

              newStatus:
                temporaryExit.status,

              newStartedAt:
                temporaryExit.startedAt,

              newEndedAt:
                temporaryExit.endedAt,

              newReason:
                temporaryExit.reason,

              newNote:
                temporaryExit.note,
            },
          });

          return {
            ok: true as const,
            message:
              type === "MISSION"
                ? "مأموریت شما با موفقیت ثبت شد."
                : "خروج موقت شما با موفقیت ثبت شد.",
          };
        },
      );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    revalidatePath("/employee");
    revalidatePath("/admin");
    revalidatePath("/admin/attendance");
    revalidatePath(
      "/admin/attendance/[userId]",
    );
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error(
      "Employee temporary exit start error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت خروج موقت انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function returnFromTemporaryExit(
  _previousState: TemporaryExitActionState = temporaryExitEmptyState,
  _formData?: FormData,
): Promise<TemporaryExitActionState> {
  const user =
    await requireEmployee();

  const { start } =
    getTodayRange();

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const attendance =
            await tx.attendance.findUnique({
              where: {
                userId_workDate: {
                  userId: user.id,
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
                "امروز ورود فعالی برای شما ثبت نشده است.",
            };
          }

          if (attendance.checkOut) {
            return {
              ok: false as const,
              message:
                "خروج نهایی امروز قبلاً ثبت شده است.",
            };
          }

          /*
           * قفل رکورد روز برای جلوگیری از
           * بازگشت همزمان و ثبت چندباره.
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
                attendanceId:
                  attendance.id,
                status: "OPEN",
              },
              orderBy: {
                startedAt: "desc",
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
            });

          if (!openExit) {
            return {
              ok: false as const,
              message:
                "هیچ خروج موقتی برای بازگشت ثبت نشده است.",
            };
          }

          const endedAt =
            new Date();

          const updated =
            await tx.temporaryExit.updateMany({
              where: {
                id: openExit.id,
                status: "OPEN",
                endedAt: null,
              },
              data: {
                endedAt,
                status: "COMPLETED",
              },
            });

          if (updated.count === 0) {
            return {
              ok: false as const,
              message:
                "بازگشت شما قبلاً ثبت شده است.",
            };
          }

          await tx.temporaryExitAudit.create({
            data: {
              temporaryExitId:
                openExit.id,

              actorId:
                user.id,

              action: "UPDATE",

              previousType:
                openExit.type,

              previousStatus:
                openExit.status,

              previousStartedAt:
                openExit.startedAt,

              previousEndedAt:
                openExit.endedAt,

              previousReason:
                openExit.reason,

              previousNote:
                openExit.note,

              newType:
                openExit.type,

              newStatus:
                "COMPLETED",

              newStartedAt:
                openExit.startedAt,

              newEndedAt:
                endedAt,

              newReason:
                openExit.reason,

              newNote:
                openExit.note,
            },
          });

          return {
            ok: true as const,
            message:
              "بازگشت شما با موفقیت ثبت شد.",
          };
        },
      );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    revalidatePath("/employee");
    revalidatePath("/admin");
    revalidatePath("/admin/attendance");
    revalidatePath(
      "/admin/attendance/[userId]",
    );
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message:
        result.message,
    };
  } catch (error) {
    console.error(
      "Employee temporary exit return error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت بازگشت انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function checkOut(): Promise<AttendanceActionState> {
  const user =
    await requireEmployee();

  const { start } =
    getTodayRange();

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const attendance =
            await tx.attendance.findUnique({
              where: {
                userId_workDate: {
                  userId: user.id,
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
           * رکورد روز را قفل می‌کنیم تا هنگام
           * ثبت خروج نهایی، وضعیت خروج موقت
           * همزمان تغییر نکند.
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
                attendanceId:
                  attendance.id,
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

          const result =
            await tx.attendance.updateMany({
              where: {
                id: attendance.id,
                checkIn: {
                  not: null,
                },
                checkOut: null,
              },
              data: {
                checkOut:
                  new Date(),
                status:
                  "COMPLETED",
              },
            });

          if (result.count === 0) {
            return {
              ok: false as const,
              message:
                "خروج امروز شما قبلاً ثبت شده است.",
            };
          }

          return {
            ok: true as const,
            message:
              "خروج شما با موفقیت ثبت شد.",
          };
        },
      );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    revalidatePath("/employee");
    revalidatePath("/admin");
    revalidatePath("/admin/attendance");
    revalidatePath(
      "/admin/attendance/[userId]",
    );
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message:
        result.message,
    };
  } catch (error) {
    console.error(
      "Employee check-out error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت خروج انجام نشد. دوباره تلاش کنید.",
    };
  }
}