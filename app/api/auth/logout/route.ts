import { NextResponse } from "next/server";

import { deleteCurrentSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await deleteCurrentSession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "خطا در خروج.",
      },
      {
        status: 500,
      },
    );
  }
}