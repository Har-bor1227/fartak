"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { getDateRange } from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

export type ManualAttendanceActionState = {
  success: boolean;
  message: string;
};

const initialState: ManualAttendanceActionState = {
  success: false,
  message: "",
};

const manualAttendanceSchema = z.object({
  userId: z.string().trim().min(
    1,
    "شناسه کارمند معتبر نیست.",
  ),

  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "تاریخ نامعتبر است.",
  ),

  checkIn: z.string().regex(
    /^\d{2}:\d{2}$/,
    "ساعت ورود نامعتبر است.",
  ),

  checkOut: z
    .string()
    .regex(
      /^\d{2}:\d{2}$/,
      "ساعت خروج نامعتبر است.",
    )
    .optional()
    .or(z.literal("")),

  note: z
    .string()
    .trim()
    .max(
      1000,
      "یادداشت نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.",
    )
    .optional()
    .or(z.literal("")),
});

function parseTimeToMinutes(
  value: string,
): number | null {
  const match =
    /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function toDateTime(
  startOfDay: Date,
  time: string,
): Date | null {
  const minutes =
    parseTimeToMinutes(time);

  if (minutes === null) {
    return null;
  }

  return new Date(
    startOfDay.getTime() +
      minutes * 60 * 1000,
  );
}

function isSerializationConflict(
  error: unknown,
): boolean {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return false;
  }

  return (
    "code" in error &&
    (error as { code?: unknown }).code ===
      "P2034"
  );
}

function isUniqueConstraintConflict(
  error: unknown,
): boolean {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return false;
  }

  return (
    "code" in error &&
    (error as { code?: unknown }).code ===
      "P2002"
  );
}

class ManualAttendanceValidationError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
    this.name =
      "ManualAttendanceValidationError";
  }
}

export async function saveManualAttendance(
  _previousState: ManualAttendanceActionState = initialState,
  formData?: FormData,
): Promise<ManualAttendanceActionState> {
  const admin =
    await requireAdmin();

  try {
    const raw = {
      userId: String(
        formData?.get("userId") ?? "",
      ),

      date: String(
        formData?.get("date") ?? "",
      ),

      checkIn: String(
        formData?.get("checkIn") ?? "",
      ),

      checkOut: String(
        formData?.get("checkOut") ?? "",
      ),

      note: String(
        formData?.get("note") ?? "",
      ),
    };

    const parsed =
      manualAttendanceSchema.safeParse(
        raw,
      );

    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]
            ?.message ??
          "اطلاعات واردشده معتبر نیست.",
      };
    }

    const {
      userId,
      date,
      checkIn,
      checkOut,
      note,
    } = parsed.data;

    const range =
      getDateRange(date);

    if (!range) {
      return {
        success: false,
        message:
          "تاریخ انتخاب‌شده معتبر نیست.",
      };
    }

    const employee =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          role: true,
          isActive: true,
          firstName: true,
          lastName: true,
        },
      });

    if (
      !employee ||
      employee.role !== "EMPLOYEE"
    ) {
      return {
        success: false,
        message:
          "کارمند انتخاب‌شده معتبر نیست.",
      };
    }

    const checkInDate =
      toDateTime(
        range.start,
        checkIn,
      );

    if (!checkInDate) {
      return {
        success: false,
        message:
          "ساعت ورود معتبر نیست.",
      };
    }

    const checkOutDate =
      checkOut
        ? toDateTime(
            range.start,
            checkOut,
          )
        : null;

    if (
      checkOut &&
      !checkOutDate
    ) {
      return {
        success: false,
        message:
          "ساعت خروج معتبر نیست.",
      };
    }

    if (
      checkOutDate &&
      checkOutDate.getTime() <=
        checkInDate.getTime()
    ) {
      return {
        success: false,
        message:
          "ساعت خروج باید بعد از ساعت ورود باشد.",
      };
    }

    const normalizedNote =
      note?.trim() || null;

    const maxRetries = 3;

    for (
      let attempt = 0;
      attempt < maxRetries;
      attempt += 1
    ) {
      try {
        await prisma.$transaction(
          async (tx) => {
            const existing =
              await tx.attendance.findUnique({
                where: {
                  userId_workDate: {
                    userId,
                    workDate:
                      range.start,
                  },
                },

                select: {
                  id: true,
                  checkIn: true,
                  checkOut: true,
                  status: true,
                  note: true,
                },
              });

            /*
             * اگر Attendance وجود داشته باشد،
             * همان رکورد را در transaction لمس می‌کنیم
             * تا عملیات همزمان روی همین روز
             * سریالی شود.
             */
            if (existing) {
              await tx.attendance.update({
                where: {
                  id: existing.id,
                },

                data: {
                  updatedAt:
                    new Date(),
                },
              });
            }

            const temporaryExits =
              existing
                ? await tx.temporaryExit.findMany({
                    where: {
                      attendanceId:
                        existing.id,
                    },

                    select: {
                      id: true,
                      status: true,
                      startedAt: true,
                      endedAt: true,
                    },

                    orderBy: {
                      startedAt: "asc",
                    },
                  })
                : [];

            /*
             * اگر برای این Attendance خروج موقت وجود دارد،
             * ساعت ورود جدید باید قبل از همه آن‌ها باشد.
             */
            for (
              const exit of temporaryExits
            ) {
              if (
                exit.startedAt.getTime() <
                checkInDate.getTime()
              ) {
                throw new ManualAttendanceValidationError(
                  "ساعت ورود جدید قبل از شروع یکی از خروج‌های موقت است.",
                );
              }

              /*
               * خروج COMPLETED بدون endedAt
               * داده ناسازگار محسوب می‌شود.
               */
              if (
                exit.status ===
                  "COMPLETED" &&
                !exit.endedAt
              ) {
                throw new ManualAttendanceValidationError(
                  "یکی از خروج‌های موقت وضعیت نامعتبر دارد. لطفاً داده را با مدیر سیستم بررسی کنید.",
                );
              }

              /*
               * خروج نهایی نمی‌تواند قبل یا همزمان
               * با شروع خروج موقت باشد.
               */
              if (
                checkOutDate &&
                exit.startedAt.getTime() >=
                  checkOutDate.getTime()
              ) {
                throw new ManualAttendanceValidationError(
                  "ساعت خروج نهایی قبل از یکی از خروج‌های موقت قرار دارد.",
                );
              }

              /*
               * پایان خروج موقت نیز باید قبل از خروج نهایی باشد.
               */
              if (
                checkOutDate &&
                exit.endedAt &&
                exit.endedAt.getTime() >
                  checkOutDate.getTime()
              ) {
                throw new ManualAttendanceValidationError(
                  "ساعت خروج نهایی قبل از پایان یکی از خروج‌های موقت قرار دارد.",
                );
              }
            }

            /*
             * اگر خروج باز وجود داشته باشد،
             * ثبت خروج نهایی دستی مجاز نیست.
             */
            if (
              checkOutDate &&
              temporaryExits.some(
                (exit) =>
                  exit.status ===
                  "OPEN",
              )
            ) {
              throw new ManualAttendanceValidationError(
                "برای این رکورد یک خروج موقت باز وجود دارد. ابتدا بازگشت آن را ثبت کنید.",
              );
            }

            const attendance =
              existing
                ? await tx.attendance.update({
                    where: {
                      id: existing.id,
                    },

                    data: {
                      checkIn:
                        checkInDate,

                      checkOut:
                        checkOutDate,

                      status:
                        "MANUAL",

                      note:
                        normalizedNote,
                    },

                    select: {
                      id: true,
                      checkIn: true,
                      checkOut: true,
                      status: true,
                      note: true,
                    },
                  })
                : await tx.attendance.create({
                    data: {
                      userId,

                      workDate:
                        range.start,

                      checkIn:
                        checkInDate,

                      checkOut:
                        checkOutDate,

                      status:
                        "MANUAL",

                      note:
                        normalizedNote,
                    },

                    select: {
                      id: true,
                      checkIn: true,
                      checkOut: true,
                      status: true,
                      note: true,
                    },
                  });

            await tx.attendanceAudit.create({
              data: {
                attendanceId:
                  attendance.id,

                actorId:
                  admin.id,

                action:
                  existing
                    ? "UPDATE"
                    : "CREATE",

                previousCheckIn:
                  existing?.checkIn ??
                  null,

                previousCheckOut:
                  existing?.checkOut ??
                  null,

                previousStatus:
                  existing?.status ??
                  null,

                previousNote:
                  existing?.note ??
                  null,

                newCheckIn:
                  attendance.checkIn,

                newCheckOut:
                  attendance.checkOut,

                newStatus:
                  attendance.status,

                newNote:
                  attendance.note,
              },
            });
          },
          {
            isolationLevel:
              "Serializable",
          },
        );

        revalidatePath(
          "/admin",
        );

        revalidatePath(
          "/admin/attendance",
        );

        revalidatePath(
          "/admin/attendance/[userId]",
        );

        revalidatePath(
          "/admin/calendar",
        );

        revalidatePath(
          "/admin/reports",
        );

        return {
          success: true,
          message:
            `رکورد حضور ${employee.firstName} ${employee.lastName} با موفقیت ثبت شد.`,
        };
      } catch (error) {
        if (
          error instanceof
          ManualAttendanceValidationError
        ) {
          return {
            success: false,
            message:
              error.message,
          };
        }

        /*
         * در رقابت همزمان روی یک رکورد،
         * PostgreSQL ممکن است transaction را
         * با P2034 برگرداند؛ retry محدود انجام می‌دهیم.
         */
        if (
          isSerializationConflict(
            error,
          ) &&
          attempt <
            maxRetries - 1
        ) {
          continue;
        }

        /*
         * برای جلوگیری از نمایش خطای خام Prisma
         * در صورت race روی رکورد unique.
         */
        if (
          isUniqueConstraintConflict(
            error,
          ) &&
          attempt <
            maxRetries - 1
        ) {
          continue;
        }

        throw error;
      }
    }

    return {
      success: false,
      message:
        "ثبت حضور انجام نشد. دوباره تلاش کنید.",
    };
  } catch (error) {
    console.error(
      "Manual attendance error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت حضور دستی انجام نشد. دوباره تلاش کنید.",
    };
  }
}