"use server";

import {
  revalidatePath,
} from "next/cache";

import { z } from "zod";

import {
  requireAdmin,
} from "@/lib/auth/current-user";

import {
  prisma,
} from "@/lib/prisma";

export type LeaveReviewActionState = {
  success: boolean;
  message: string;
};

const initialState: LeaveReviewActionState = {
  success: false,
  message: "",
};

const reviewSchema = z.object({
  leaveId: z
    .string()
    .trim()
    .min(
      1,
      "شناسه درخواست معتبر نیست.",
    ),

  decision: z.enum([
    "APPROVED",
    "REJECTED",
  ]),

  reviewNote: z
    .string()
    .trim()
    .max(
      1000,
      "توضیح بررسی نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.",
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

async function reviewLeaveWithTransaction(
  adminId: string,
  leaveId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote: string | null,
) {
  return prisma.$transaction(
    async (tx) => {
      /*
       * رکورد را داخل همان transaction می‌خوانیم
       * تا تمام تصمیم‌گیری و update اتمیک باشد.
       */
      const leave =
        await tx.leave.findUnique({
          where: {
            id: leaveId,
          },

          select: {
            id: true,
            userId: true,
            status: true,
            startDate: true,
            endDate: true,

            user: {
              select: {
                role: true,
                isActive: true,
              },
            },
          },
        });

      if (!leave) {
        return {
          success: false as const,
          message:
            "درخواست مرخصی پیدا نشد.",
        };
      }

      if (
        leave.status !==
        "PENDING"
      ) {
        return {
          success: false as const,
          message:
            "این درخواست قبلاً بررسی شده است.",
        };
      }

      if (
        leave.user.role !==
        "EMPLOYEE"
      ) {
        return {
          success: false as const,
          message:
            "درخواست مربوط به یک کارمند معتبر نیست.",
        };
      }

      /*
       * هنگام تأیید، درخواست‌های Approved
       * هم‌پوشان دوباره بررسی می‌شوند.
       *
       * transaction در isolation level Serializable
       * باعث می‌شود دو تأیید همزمان نتوانند
       * هر دو با موفقیت از این بررسی عبور کنند.
       */
      if (
        decision ===
        "APPROVED"
      ) {
        const conflictingLeave =
          await tx.leave.findFirst({
            where: {
              id: {
                not: leave.id,
              },

              userId:
                leave.userId,

              status:
                "APPROVED",

              startDate: {
                lte:
                  leave.endDate,
              },

              endDate: {
                gte:
                  leave.startDate,
              },
            },

            select: {
              id: true,
            },
          });

        if (
          conflictingLeave
        ) {
          return {
            success: false as const,
            message:
              "این درخواست با یک مرخصی تأییدشده دیگر هم‌پوشانی دارد.",
          };
        }
      }

      /*
       * تغییر وضعیت شرطی است تا اگر درخواست
       * بین read و update توسط transaction دیگری
       * بررسی شده باشد، این عملیات آن را overwrite نکند.
       */
      const result =
        await tx.leave.updateMany({
          where: {
            id: leave.id,
            status: "PENDING",
          },

          data: {
            status:
              decision,

            reviewerId:
              adminId,

            reviewedAt:
              new Date(),

            reviewNote,
          },
        });

      if (
        result.count !== 1
      ) {
        return {
          success: false as const,
          message:
            "این درخواست هم‌اکنون توسط مدیر دیگری بررسی شده است.",
        };
      }

      return {
        success: true as const,
        message:
          decision ===
          "APPROVED"
            ? "درخواست مرخصی با موفقیت تأیید شد."
            : "درخواست مرخصی با موفقیت رد شد.",
      };
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

export async function reviewLeaveRequest(
  _previousState: LeaveReviewActionState = initialState,
  formData?: FormData,
): Promise<LeaveReviewActionState> {
  const admin =
    await requireAdmin();

  try {
    const parsed =
      reviewSchema.safeParse({
        leaveId:
          formData?.get(
            "leaveId",
          ),

        decision:
          formData?.get(
            "decision",
          ),

        reviewNote:
          formData?.get(
            "reviewNote",
          ),
      });

    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]
            ?.message ??
          "اطلاعات بررسی معتبر نیست.",
      };
    }

    const {
      leaveId,
      decision,
      reviewNote,
    } = parsed.data;

    const normalizedReviewNote =
      reviewNote?.trim() ||
      null;

    if (
      decision ===
        "REJECTED" &&
      !normalizedReviewNote
    ) {
      return {
        success: false,
        message:
          "برای رد درخواست، توضیح بررسی الزامی است.",
      };
    }

    /*
     * Serializable ممکن است در شرایط
     * همزمانی یک transaction را با P2034
     * برگرداند. چند بار محدود retry می‌کنیم.
     */
    const maxRetries = 3;

    for (
      let attempt = 0;
      attempt < maxRetries;
      attempt += 1
    ) {
      try {
        const result =
          await reviewLeaveWithTransaction(
            admin.id,
            leaveId,
            decision,
            normalizedReviewNote,
          );

        revalidatePath(
          "/admin",
        );

        revalidatePath(
          "/admin/leave",
        );

        revalidatePath(
          "/employee",
        );

        revalidatePath(
          "/employee/leave",
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
        "بررسی درخواست مرخصی انجام نشد. دوباره تلاش کنید.",
    };
  } catch (error) {
    console.error(
      "Review leave request error:",
      error,
    );

    return {
      success: false,
      message:
        isSerializationConflict(
          error,
        )
          ? "به دلیل همزمانی درخواست‌ها، بررسی انجام نشد. دوباره تلاش کنید."
          : "بررسی درخواست مرخصی انجام نشد. دوباره تلاش کنید.",
    };
  }
}