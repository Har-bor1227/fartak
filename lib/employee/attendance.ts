"use server";

import { revalidatePath } from "next/cache";

import { requireEmployee } from "@/lib/auth/current-user";
import {
  checkInForUser,
  checkOutForUser,
} from "@/lib/employee/attendance-service";
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

function revalidateAttendancePaths() {
  revalidatePath("/employee");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/[userId]");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/reports");
}

function parseTemporaryExitType(
  value: string,
): "TEMPORARY" | "MISSION" | null {
  if (value === "TEMPORARY" || value === "MISSION") {
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

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

/**
 * ثبت ورود کارمند در حضورینو.
 *
 * این اکشن هویت کارمند را از نشست معتبر حضورینو می‌گیرد
 * و منطق اصلی ثبت ورود را از سرویس مشترک اجرا می‌کند.
 */
export async function checkIn(
  _previousState: AttendanceActionState = emptyState,
  _formData?: FormData,
): Promise<AttendanceActionState> {
  const user = await requireEmployee();

  const result = await checkInForUser(user.id);

  if (result.success) {
    revalidateAttendancePaths();
  }

  return result;
}

/**
 * ثبت خروج موقت یا مأموریت.
 */
export async function startTemporaryExit(
  _previousState: TemporaryExitActionState =
    temporaryExitEmptyState,
  formData?: FormData,
): Promise<TemporaryExitActionState> {
  const user = await requireEmployee();

  const { start } = getTodayRange();

  try {
    const type = parseTemporaryExitType(
      String(formData?.get("type") ?? ""),
    );

    if (!type) {
      return {
        success: false,
        message: "نوع خروج را انتخاب کنید.",
      };
    }

    const reason = normalizeOptionalText(
      formData?.get("reason"),
      500,
    );

    const result = await prisma.$transaction(
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
            message: "ابتدا باید ورود خود را ثبت کنید.",
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
         * با تغییر رکورد حضور در ابتدای تراکنش،
         * عملیات هم‌زمان روی همان روز هماهنگ می‌شوند.
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
              "در حال حاضر یک خروج باز دارید. ابتدا باید بازگشت خود را ثبت کنید.",
          };
        }

        const temporaryExit =
          await tx.temporaryExit.create({
            data: {
              userId: user.id,
              attendanceId: attendance.id,
              type,
              status: "OPEN",
              startedAt: new Date(),
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
            temporaryExitId: temporaryExit.id,
            actorId: user.id,
            action: "CREATE",

            previousType: null,
            previousStatus: null,
            previousStartedAt: null,
            previousEndedAt: null,
            previousReason: null,
            previousNote: null,

            newType: temporaryExit.type,
            newStatus: temporaryExit.status,
            newStartedAt: temporaryExit.startedAt,
            newEndedAt: temporaryExit.endedAt,
            newReason: temporaryExit.reason,
            newNote: temporaryExit.note,
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

    revalidateAttendancePaths();

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

/**
 * ثبت بازگشت از خروج موقت یا مأموریت.
 */
export async function returnFromTemporaryExit(
  _previousState: TemporaryExitActionState =
    temporaryExitEmptyState,
  _formData?: FormData,
): Promise<TemporaryExitActionState> {
  const user = await requireEmployee();

  const { start } = getTodayRange();

  try {
    const result = await prisma.$transaction(
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
         * به‌روزرسانی رکورد حضور برای هماهنگ‌کردن
         * عملیات هم‌زمان روی همان روز.
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

        const endedAt = new Date();

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
            temporaryExitId: openExit.id,
            actorId: user.id,
            action: "UPDATE",

            previousType: openExit.type,
            previousStatus: openExit.status,
            previousStartedAt: openExit.startedAt,
            previousEndedAt: openExit.endedAt,
            previousReason: openExit.reason,
            previousNote: openExit.note,

            newType: openExit.type,
            newStatus: "COMPLETED",
            newStartedAt: openExit.startedAt,
            newEndedAt: endedAt,
            newReason: openExit.reason,
            newNote: openExit.note,
          },
        });

        return {
          ok: true as const,
          message: "بازگشت شما با موفقیت ثبت شد.",
        };
      },
    );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    revalidateAttendancePaths();

    return {
      success: true,
      message: result.message,
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

/**
 * ثبت خروج نهایی کارمند در حضورینو.
 *
 * منطق بررسی ورود قبلی، جلوگیری از خروج تکراری
 * و جلوگیری از خروج در زمان بازبودن خروج موقت
 * در سرویس مشترک اجرا می‌شود.
 */
export async function checkOut(): Promise<AttendanceActionState> {
  const user = await requireEmployee();

  const result = await checkOutForUser(user.id);

  if (result.success) {
    revalidateAttendancePaths();
  }

  return result;
}