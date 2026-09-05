import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "نام کاربری الزامی است.")
    .max(100),

  password: z
    .string()
    .min(1, "رمز عبور الزامی است.")
    .max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "اطلاعات ورود صحیح نیست.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      username,
      password,
    } = validation.data;

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "نام کاربری یا رمز عبور اشتباه است.",
        },
        {
          status: 401,
        },
      );
    }

    const validPassword =
      await verifyPassword(
        password,
        user.passwordHash,
      );

    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "نام کاربری یا رمز عبور اشتباه است.",
        },
        {
          status: 401,
        },
      );
    }

    await createSession(user.id);

    const redirectTo =
      user.role === "ADMIN"
        ? "/admin"
        : "/employee";

    return NextResponse.json({
      success: true,

      redirectTo,

      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "خطایی در ورود رخ داد.",
      },
      {
        status: 500,
      },
    );
  }
}