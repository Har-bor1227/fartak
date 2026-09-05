"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export type EmployeeActionState = {
  success: boolean;
  message: string;
};

const employeeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "نام باید حداقل ۲ کاراکتر باشد.")
    .max(60, "نام بیش از حد طولانی است."),

  lastName: z
    .string()
    .trim()
    .min(2, "نام خانوادگی باید حداقل ۲ کاراکتر باشد.")
    .max(80, "نام خانوادگی بیش از حد طولانی است."),

  username: z
    .string()
    .trim()
    .min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد.")
    .max(50, "نام کاربری بیش از حد طولانی است.")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد.",
    ),

  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
    .max(100, "رمز عبور بیش از حد طولانی است."),

  phone: z
    .string()
    .trim()
    .max(20, "شماره تماس بیش از حد طولانی است.")
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
    .max(100, "رمز عبور بیش از حد طولانی است."),
});

export async function createEmployee(
  _previousState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  await requireAdmin();

  const validation = employeeSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues[0]?.message ||
        "اطلاعات وارد شده صحیح نیست.",
    };
  }

  const {
    firstName,
    lastName,
    username,
    password,
    phone,
  } = validation.data;

  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      success: false,
      message: "این نام کاربری قبلاً استفاده شده است.",
    };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      username,
      passwordHash,
      phone: phone || null,
      role: "EMPLOYEE",
      isActive: true,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/employees");

  return {
    success: true,
    message: "کارمند با موفقیت ایجاد شد.",
  };
}

export async function toggleEmployeeStatus(
  userId: string,
): Promise<EmployeeActionState> {
  await requireAdmin();

  if (!userId) {
    return {
      success: false,
      message: "شناسه کارمند نامعتبر است.",
    };
  }

  const employee = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!employee || employee.role !== "EMPLOYEE") {
    return {
      success: false,
      message: "کارمند موردنظر پیدا نشد.",
    };
  }

  await prisma.user.update({
    where: {
      id: employee.id,
    },
    data: {
      isActive: !employee.isActive,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/employees");

  return {
    success: true,
    message: employee.isActive
      ? "کارمند غیرفعال شد."
      : "کارمند فعال شد.",
  };
}

export async function changeEmployeePassword(
  userId: string,
  password: string,
): Promise<EmployeeActionState> {
  await requireAdmin();

  const validation = passwordSchema.safeParse({
    password,
  });

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues[0]?.message ||
        "رمز عبور معتبر نیست.",
    };
  }

  if (!userId) {
    return {
      success: false,
      message: "شناسه کارمند نامعتبر است.",
    };
  }

  const employee = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!employee || employee.role !== "EMPLOYEE") {
    return {
      success: false,
      message: "کارمند موردنظر پیدا نشد.",
    };
  }

  const passwordHash = await hashPassword(
    validation.data.password,
  );

  await prisma.user.update({
    where: {
      id: employee.id,
    },
    data: {
      passwordHash,
    },
  });

  // تمام Sessionهای قبلی این کاربر بسته می‌شوند.
  await prisma.session.deleteMany({
    where: {
      userId: employee.id,
    },
  });

  revalidatePath("/admin/employees");

  return {
    success: true,
    message:
      "رمز عبور تغییر کرد و نشست‌های قبلی کاربر بسته شد.",
  };
}