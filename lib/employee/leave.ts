"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireEmployee,
} from "@/lib/auth/current-user";

import {
  getDateRange,
} from "@/lib/date/tehran";

import {
  prisma,
} from "@/lib/prisma";

export type LeaveActionState = {
  success: boolean;
  message: string;
};

const initialState: LeaveActionState = {
  success: false,
  message: "",
};

const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "UNPAID",
  "OTHER",
] as const;

type LeaveTypeValue =
  (typeof LEAVE_TYPES)[number];

function getString(
  value: FormDataEntryValue | null,
): string {
  return String(
    value ?? "",
  ).trim();
}

export async function createLeaveRequest(
  _previousState: LeaveActionState = initialState,
  formData?: FormData,
): Promise<LeaveActionState> {
  const user =
    await requireEmployee();

  try {
    const type =
      getString(
        formData?.get("type") ??
          null,
      );

    const startDate =
      getString(
        formData?.get("startDate") ??
          null,
      );

    const endDate =
      getString(
        formData?.get("endDate") ??
          null,
      );

    const reason =
      getString(
        formData?.get("reason") ??
          null,
      );

    if (
      !LEAVE_TYPES.includes(
        type as LeaveTypeValue,
      )
    ) {
      return {
        success: false,
        message:
          "نوع مرخصی انتخاب‌شده معتبر نیست.",
      };
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        startDate,
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        endDate,
      )
    ) {
      return {
        success: false,
        message:
          "تاریخ شروع یا پایان معتبر نیست.",
      };
    }

    const startRange =
      getDateRange(startDate);

    const endRange =
      getDateRange(endDate);

    if (
      !startRange ||
      !endRange
    ) {
      return {
        success: false,
        message:
          "بازه تاریخ انتخاب‌شده معتبر نیست.",
      };
    }

    if (
      startRange.start.getTime() >
      endRange.start.getTime()
    ) {
      return {
        success: false,
        message:
          "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.",
      };
    }

    if (
      reason.length > 1000
    ) {
      return {
        success: false,
        message:
          "توضیحات نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.",
      };
    }

    /*
     * فقط درخواست‌های در انتظار و تأییدشده
     * در بررسی هم‌پوشانی معتبر هستند.
     *
     * درخواست‌های ردشده یا لغوشده مزاحم
     * ثبت درخواست جدید نمی‌شوند.
     */
    const overlappingLeave =
      await prisma.leave.findFirst({
        where: {
          userId: user.id,

          status: {
            in: [
              "PENDING",
              "APPROVED",
            ],
          },

          AND: [
            {
              startDate: {
                lte:
                  endRange.start,
              },
            },

            {
              endDate: {
                gte:
                  startRange.start,
              },
            },
          ],
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (overlappingLeave) {
      return {
        success: false,
        message:
          overlappingLeave.status ===
          "APPROVED"
            ? "در این بازه یک مرخصی تأییدشده دارید."
            : "در این بازه یک درخواست مرخصی در انتظار بررسی دارید.",
      };
    }

    await prisma.leave.create({
      data: {
        userId: user.id,

        type:
          type as LeaveTypeValue,

        status: "PENDING",

        startDate:
          startRange.start,

        endDate:
          endRange.start,

        reason:
          reason || null,
      },
    });

    revalidatePath(
      "/employee",
    );

    revalidatePath(
      "/employee/leave",
    );

    return {
      success: true,
      message:
        "درخواست مرخصی با موفقیت ثبت شد و در انتظار بررسی مدیر است.",
    };
  } catch (error) {
    console.error(
      "Create leave request error:",
      error,
    );

    return {
      success: false,
      message:
        "ثبت درخواست مرخصی انجام نشد. دوباره تلاش کنید.",
    };
  }
}