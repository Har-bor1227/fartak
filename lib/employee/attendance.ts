"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireEmployee,
} from "@/lib/auth/current-user";

import {
  getTodayRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

export type AttendanceActionState = {
  success: boolean;
  message: string;
};

const emptyState: AttendanceActionState = {
  success: false,
  message: "",
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

export async function checkIn(
  _previousState: AttendanceActionState = emptyState,
  _formData?: FormData,
): Promise<AttendanceActionState> {
  const user =
    await requireEmployee();

  const { start } =
    getTodayRange();

  try {
    /*
     * ابتدا رکورد امروز را پیدا می‌کنیم.
     * چون روی userId + workDate یک unique constraint داریم،
     * ایجاد همزمان رکورد بعداً با P2002 قابل مدیریت است.
     */
    const existing =
      await prisma.attendance.findUnique({
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

    if (existing?.checkIn) {
      return {
        success: false,
        message:
          "ورود امروز شما قبلاً ثبت شده است.",
      };
    }

    /*
     * اگر رکوردی از قبل وجود دارد ولی ورود ندارد،
     * فقط همان رکورد را تکمیل می‌کنیم.
     *
     * checkOut عمداً reset نمی‌شود؛
     * چنین رکوردی از نظر دیتابیس وضعیت خاصی دارد
     * و نباید بدون بررسی آن را پاک کنیم.
     */
    if (existing) {
      const result =
        await prisma.attendance.updateMany({
          where: {
            id: existing.id,
            checkIn: null,
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
      /*
       * ایجاد رکورد جدید.
       *
       * اگر درخواست دیگری دقیقاً همزمان
       * همین رکورد را ایجاد کرده باشد،
       * unique constraint دیتابیس از ایجاد
       * رکورد دوم جلوگیری می‌کند.
       */
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
    revalidatePath(
      "/admin/attendance",
    );
    revalidatePath(
      "/admin/attendance/[userId]",
    );
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

export async function checkOut(): Promise<AttendanceActionState> {
  const user =
    await requireEmployee();

  const { start } =
    getTodayRange();

  try {
    const attendance =
      await prisma.attendance.findUnique({
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
        success: false,
        message:
          "ابتدا باید ورود خود را ثبت کنید.",
      };
    }

    if (attendance.checkOut) {
      return {
        success: false,
        message:
          "خروج امروز شما قبلاً ثبت شده است.",
      };
    }

    /*
     * خروج به‌صورت شرطی update می‌شود.
     *
     * اگر دو درخواست همزمان برای خروج ارسال شوند،
     * فقط یکی از آنها رکوردی را که هنوز checkOut ندارد
     * به‌روزرسانی خواهد کرد.
     */
    const result =
      await prisma.attendance.updateMany({
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

    if (result.count === 0) {
      return {
        success: false,
        message:
          "خروج امروز شما قبلاً ثبت شده است.",
      };
    }

    revalidatePath("/employee");
    revalidatePath("/admin");
    revalidatePath(
      "/admin/attendance",
    );
    revalidatePath(
      "/admin/attendance/[userId]",
    );
    revalidatePath("/admin/reports");

    return {
      success: true,
      message:
        "خروج شما با موفقیت ثبت شد.",
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