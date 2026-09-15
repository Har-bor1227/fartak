"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type ShiftActionState = {
  success: boolean;
  message: string;
};

function parseTimeToMinutes(
  value: string,
): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hoursText, minutesText] =
    value.split(":");

  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

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

const shiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "نام شیفت حداقل باید ۲ کاراکتر باشد.",
    )
    .max(
      80,
      "نام شیفت بیش از حد طولانی است.",
    ),

  start: z.string(),

  end: z.string(),

  saturday: z.boolean(),
  sunday: z.boolean(),
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
});

function readShiftForm(
  formData: FormData,
) {
  return {
    name:
      String(
        formData.get("name") ?? "",
      ),

    start:
      String(
        formData.get("start") ?? "",
      ),

    end:
      String(
        formData.get("end") ?? "",
      ),

    saturday:
      formData.get("saturday") ===
      "on",

    sunday:
      formData.get("sunday") ===
      "on",

    monday:
      formData.get("monday") ===
      "on",

    tuesday:
      formData.get("tuesday") ===
      "on",

    wednesday:
      formData.get("wednesday") ===
      "on",

    thursday:
      formData.get("thursday") ===
      "on",

    friday:
      formData.get("friday") ===
      "on",
  };
}

export async function createShift(
  _previousState: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  await requireAdmin();

  const validation =
    shiftSchema.safeParse(
      readShiftForm(formData),
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues[0]?.message ??
        "اطلاعات شیفت معتبر نیست.",
    };
  }

  const startMinutes =
    parseTimeToMinutes(
      validation.data.start,
    );

  const endMinutes =
    parseTimeToMinutes(
      validation.data.end,
    );

  if (
    startMinutes === null ||
    endMinutes === null
  ) {
    return {
      success: false,
      message:
        "ساعت شروع یا پایان معتبر نیست.",
    };
  }

  if (
    startMinutes >= endMinutes
  ) {
    return {
      success: false,
      message:
        "ساعت پایان باید بعد از ساعت شروع باشد.",
    };
  }

  const hasWorkDay =
    validation.data.saturday ||
    validation.data.sunday ||
    validation.data.monday ||
    validation.data.tuesday ||
    validation.data.wednesday ||
    validation.data.thursday ||
    validation.data.friday;

  if (!hasWorkDay) {
    return {
      success: false,
      message:
        "حداقل یک روز کاری برای شیفت انتخاب کنید.",
    };
  }

  const existing =
    await prisma.shift.findFirst({
      where: {
        name: validation.data.name,
      },
      select: {
        id: true,
      },
    });

  if (existing) {
    return {
      success: false,
      message:
        "شیفتی با این نام قبلاً ثبت شده است.",
    };
  }

  await prisma.shift.create({
    data: {
      name: validation.data.name,

      startMinutes,
      endMinutes,

      saturday:
        validation.data.saturday,

      sunday:
        validation.data.sunday,

      monday:
        validation.data.monday,

      tuesday:
        validation.data.tuesday,

      wednesday:
        validation.data.wednesday,

      thursday:
        validation.data.thursday,

      friday:
        validation.data.friday,

      isActive: true,
    },
  });

  revalidatePath("/admin/settings");

  return {
    success: true,
    message:
      "شیفت با موفقیت ایجاد شد.",
  };
}

export async function toggleShift(
  shiftId: string,
): Promise<ShiftActionState> {
  await requireAdmin();

  if (!shiftId) {
    return {
      success: false,
      message:
        "شناسه شیفت معتبر نیست.",
    };
  }

  const shift =
    await prisma.shift.findUnique({
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
      success: false,
      message:
        "شیفت موردنظر پیدا نشد.",
    };
  }

  await prisma.shift.update({
    where: {
      id: shift.id,
    },
    data: {
      isActive: !shift.isActive,
    },
  });

  revalidatePath("/admin/settings");

  return {
    success: true,
    message: shift.isActive
      ? "شیفت غیرفعال شد."
      : "شیفت فعال شد.",
  };
}

export async function deleteShift(
  shiftId: string,
): Promise<ShiftActionState> {
  await requireAdmin();

  if (!shiftId) {
    return {
      success: false,
      message:
        "شناسه شیفت معتبر نیست.",
    };
  }

  const shift =
    await prisma.shift.findUnique({
      where: {
        id: shiftId,
      },
      select: {
        id: true,
        _count: {
          select: {
            employeeShifts: true,
          },
        },
      },
    });

  if (!shift) {
    return {
      success: false,
      message:
        "شیفت موردنظر پیدا نشد.",
    };
  }

  if (
    shift._count.employeeShifts > 0
  ) {
    return {
      success: false,
      message:
        "این شیفت به یک یا چند کارمند تخصیص داده شده و قابل حذف نیست. ابتدا تخصیص‌ها را حذف کنید.",
    };
  }

  await prisma.shift.delete({
    where: {
      id: shift.id,
    },
  });

  revalidatePath("/admin/settings");

  return {
    success: true,
    message:
      "شیفت حذف شد.",
  };
}