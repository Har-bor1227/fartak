"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import {
  getDateRange,
  getTodayRange,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

export type EmployeeShiftActionState = {
  success: boolean;
  message: string;
};

const assignSchema = z.object({
  userId: z.string().trim().min(1),
  shiftId: z.string().trim().min(1),

  startsAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "تاریخ شروع معتبر نیست.",
    ),

  endsAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "تاریخ پایان معتبر نیست.",
    )
    .optional()
    .or(z.literal("")),
});

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

async function createEmployeeShiftWithTransaction(
  userId: string,
  shiftId: string,
  startsAt: Date,
  endsAt: Date | null,
) {
  return prisma.$transaction(
    async (tx) => {
      const employee =
        await tx.user.findFirst({
          where: {
            id: userId,
            role: "EMPLOYEE",
          },
          select: {
            id: true,
            isActive: true,
          },
        });

      if (!employee) {
        return {
          success: false as const,
          message:
            "کارمند موردنظر پیدا نشد.",
        };
      }

      if (!employee.isActive) {
        return {
          success: false as const,
          message:
            "برای کارمند غیرفعال نمی‌توان شیفت جدید تعریف کرد.",
        };
      }

      const shift =
        await tx.shift.findUnique({
          where: {
            id: shiftId,
          },
          select: {
            id: true,
            isActive: true,
          },
        });

      if (!shift) {
        return {
          success: false as const,
          message:
            "شیفت موردنظر پیدا نشد.",
        };
      }

      if (!shift.isActive) {
        return {
          success: false as const,
          message:
            "این شیفت غیرفعال است و قابل اختصاص نیست.",
        };
      }

      /*
       * startsAt = شروع بازه به‌صورت inclusive
       * endsAt   = پایان بازه به‌صورت exclusive
       *
       * مثال:
       * 1405/07/01 تا 1405/07/10
       * از ابتدای روز اول تا ابتدای روز دهم معتبر است.
       */
      const overlappingAssignment =
        await tx.employeeShift.findFirst({
          where: {
            userId: employee.id,

            startsAt: {
              lt:
                endsAt ??
                new Date(
                  "9999-12-31T00:00:00.000Z",
                ),
            },

            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gt: startsAt,
                },
              },
            ],
          },

          select: {
            id: true,
          },
        });

      if (overlappingAssignment) {
        return {
          success: false as const,
          message:
            "این بازه با یک انتساب شیفت قبلی هم‌پوشانی دارد.",
        };
      }

      await tx.employeeShift.create({
        data: {
          userId: employee.id,
          shiftId: shift.id,
          startsAt,
          endsAt,
        },
      });

      return {
        success: true as const,
        message:
          "شیفت با موفقیت به کارمند اختصاص داده شد.",
      };
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

export async function assignEmployeeShift(
  _previousState: EmployeeShiftActionState,
  formData: FormData,
): Promise<EmployeeShiftActionState> {
  await requireAdmin();

  try {
    const validation =
      assignSchema.safeParse({
        userId: formData.get(
          "userId",
        ),
        shiftId: formData.get(
          "shiftId",
        ),
        startsAt: formData.get(
          "startsAt",
        ),
        endsAt: formData.get(
          "endsAt",
        ),
      });

    if (!validation.success) {
      return {
        success: false,
        message:
          validation.error
            .issues[0]?.message ||
          "اطلاعات انتساب شیفت معتبر نیست.",
      };
    }

    const startRange =
      getDateRange(
        validation.data.startsAt,
      );

    if (!startRange) {
      return {
        success: false,
        message:
          "تاریخ شروع شیفت معتبر نیست.",
      };
    }

    let endDate: Date | null =
      null;

    if (
      validation.data.endsAt
    ) {
      const endRange =
        getDateRange(
          validation.data.endsAt,
        );

      if (!endRange) {
        return {
          success: false,
          message:
            "تاریخ پایان شیفت معتبر نیست.",
        };
      }

      if (
        endRange.start.getTime() <=
        startRange.start.getTime()
      ) {
        return {
          success: false,
          message:
            "تاریخ پایان باید بعد از تاریخ شروع باشد.",
        };
      }

      endDate =
        endRange.start;
    }

    /*
     * کل بررسی و ایجاد در یک transaction
     * با isolation level Serializable انجام می‌شود.
     *
     * در صورت رقابت همزمان، PostgreSQL ممکن است
     * یکی از transactionها را با P2034 متوقف کند.
     * آن transaction را چند بار محدود retry می‌کنیم.
     */
    const maxRetries = 3;

    for (
      let attempt = 0;
      attempt < maxRetries;
      attempt += 1
    ) {
      try {
        const result =
          await createEmployeeShiftWithTransaction(
            validation.data.userId,
            validation.data.shiftId,
            startRange.start,
            endDate,
          );

        if (!result.success) {
          return result;
        }

        revalidatePath(
          "/admin/employees",
        );
        revalidatePath(
          "/admin/employees/shifts",
        );
        revalidatePath("/admin");
        revalidatePath(
          "/admin/attendance",
        );
        revalidatePath(
          "/admin/calendar",
        );
        revalidatePath(
          "/admin/reports",
        );

        return result;
      } catch (error) {
        if (
          isSerializationConflict(
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
        "به دلیل همزمانی درخواست‌ها، انتساب شیفت انجام نشد. دوباره تلاش کنید.",
    };
  } catch (error) {
    console.error(
      "Assign employee shift error:",
      error,
    );

    return {
      success: false,
      message:
        isSerializationConflict(
          error,
        )
          ? "به دلیل همزمانی درخواست‌ها، انتساب شیفت انجام نشد. دوباره تلاش کنید."
          : "انتساب شیفت انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function endEmployeeShift(
  employeeShiftId: string,
): Promise<EmployeeShiftActionState> {
  await requireAdmin();

  if (!employeeShiftId) {
    return {
      success: false,
      message:
        "شناسه انتساب شیفت معتبر نیست.",
    };
  }

  const assignment =
    await prisma.employeeShift.findUnique({
      where: {
        id: employeeShiftId,
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
      },
    });

  if (!assignment) {
    return {
      success: false,
      message:
        "انتساب شیفت پیدا نشد.",
    };
  }

  if (assignment.endsAt) {
    return {
      success: false,
      message:
        "این انتساب قبلاً پایان یافته است.",
    };
  }

  /*
   * پایان انتساب از ابتدای امروز ثبت می‌شود.
   *
   * اگر انتساب از امروز یا بعد از امروز شروع شده باشد،
   * endsAt از startsAt کوچک‌تر یا مساوی می‌شود.
   */
  const {
    start: todayStart,
  } = getTodayRange();

  if (
    assignment.startsAt.getTime() >=
    todayStart.getTime()
  ) {
    return {
      success: false,
      message:
        "این انتساب هنوز قبل از امروز شروع نشده است و قابل پایان‌دادن نیست.",
    };
  }

  const updateResult =
    await prisma.employeeShift.updateMany({
      where: {
        id: assignment.id,
        endsAt: null,
      },
      data: {
        endsAt: todayStart,
      },
    });

  if (updateResult.count !== 1) {
    return {
      success: false,
      message:
        "انتساب شیفت تغییر کرده یا قبلاً پایان یافته است.",
    };
  }

  revalidatePath(
    "/admin/employees",
  );
  revalidatePath(
    "/admin/employees/shifts",
  );
  revalidatePath("/admin");
  revalidatePath(
    "/admin/attendance",
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
      "انتساب شیفت با موفقیت از ابتدای امروز پایان یافت.",
  };
}