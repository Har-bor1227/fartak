"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import {
  getDateRange,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

export type SettingsActionState = {
  success: boolean;
  message: string;
};

function parseTimeToMinutes(
  value: string,
): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const parts = value.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

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

const scheduleSchema = z.object({
  workStart: z.string(),
  workEnd: z.string(),

  saturday: z.boolean(),
  sunday: z.boolean(),
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
});

export async function saveWorkSchedule(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const validation =
    scheduleSchema.safeParse({
      workStart: formData.get("workStart"),
      workEnd: formData.get("workEnd"),

      saturday:
        formData.get("saturday") === "on",

      sunday:
        formData.get("sunday") === "on",

      monday:
        formData.get("monday") === "on",

      tuesday:
        formData.get("tuesday") === "on",

      wednesday:
        formData.get("wednesday") === "on",

      thursday:
        formData.get("thursday") === "on",

      friday:
        formData.get("friday") === "on",
    });

  if (!validation.success) {
    return {
      success: false,
      message:
        "اطلاعات برنامه کاری معتبر نیست.",
    };
  }

  const startMinutes =
    parseTimeToMinutes(
      validation.data.workStart,
    );

  const endMinutes =
    parseTimeToMinutes(
      validation.data.workEnd,
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

  if (startMinutes >= endMinutes) {
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
        "حداقل یک روز کاری باید انتخاب شود.",
    };
  }

  await prisma.companySettings.upsert({
    where: {
      id: "company",
    },

    update: {
      workStartMinutes: startMinutes,
      workEndMinutes: endMinutes,

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
    },

    create: {
      id: "company",

      workStartMinutes: startMinutes,
      workEndMinutes: endMinutes,

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
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/reports");

  return {
    success: true,
    message:
      "برنامه کاری با موفقیت ذخیره شد.",
  };
}

const holidaySchema = z.object({
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "تاریخ معتبر نیست.",
    ),

  title: z
    .string()
    .trim()
    .min(
      2,
      "عنوان تعطیلی حداقل باید ۲ کاراکتر باشد.",
    )
    .max(
      100,
      "عنوان تعطیلی بیش از حد طولانی است.",
    ),

  description: z
    .string()
    .trim()
    .max(
      300,
      "توضیحات بیش از حد طولانی است.",
    )
    .optional()
    .or(z.literal("")),
});

export async function createHoliday(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const validation =
    holidaySchema.safeParse({
      date: formData.get("date"),
      title: formData.get("title"),
      description:
        formData.get("description"),
    });

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues[0]?.message ||
        "اطلاعات تعطیلی معتبر نیست.",
    };
  }

  const range = getDateRange(
    validation.data.date,
  );

  if (!range) {
    return {
      success: false,
      message:
        "تاریخ تعطیلی معتبر نیست.",
    };
  }

  const existing =
    await prisma.holiday.findUnique({
      where: {
        date: range.start,
      },

      select: {
        id: true,
      },
    });

  if (existing) {
    return {
      success: false,
      message:
        "برای این تاریخ قبلاً تعطیلی ثبت شده است.",
    };
  }

  await prisma.holiday.create({
    data: {
      date: range.start,
      title: validation.data.title,
      description:
        validation.data.description ||
        null,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/reports");

  return {
    success: true,
    message:
      "تعطیلی با موفقیت ثبت شد.",
  };
}

export async function deleteHoliday(
  holidayId: string,
): Promise<SettingsActionState> {
  await requireAdmin();

  if (!holidayId) {
    return {
      success: false,
      message:
        "شناسه تعطیلی معتبر نیست.",
    };
  }

  const holiday =
    await prisma.holiday.findUnique({
      where: {
        id: holidayId,
      },

      select: {
        id: true,
      },
    });

  if (!holiday) {
    return {
      success: false,
      message:
        "تعطیلی موردنظر پیدا نشد.",
    };
  }

  await prisma.holiday.delete({
    where: {
      id: holiday.id,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/reports");

  return {
    success: true,
    message:
      "تعطیلی حذف شد.",
  };
}