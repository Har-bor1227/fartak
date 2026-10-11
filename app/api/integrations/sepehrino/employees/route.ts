import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_SECRET_LENGTH = 32;

function jsonResponse(
  data: {
    success: boolean;
    message?: string;
    employees?: Array<{
      id: string;
      username: string;
      firstName: string;
      lastName: string;
    }>;
  },
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

function isAuthorized(
  request: Request,
  expectedSecret: string,
): boolean {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return false;
  }

  const providedSecret =
    authorization.slice("Bearer ".length);

  if (!providedSecret) {
    return false;
  }

  const providedBuffer =
    Buffer.from(providedSecret, "utf8");

  const expectedBuffer =
    Buffer.from(expectedSecret, "utf8");

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    expectedBuffer,
  );
}

export async function GET(
  request: Request,
) {
  const integrationSecret =
    process.env.HOZORINO_INTEGRATION_SECRET;

  if (
    !integrationSecret ||
    integrationSecret.length <
      MIN_SECRET_LENGTH
  ) {
    console.error(
      "Hozorino integration secret is missing or too short.",
    );

    return jsonResponse(
      {
        success: false,
        message:
          "ارتباط بین سامانه‌ها هنوز پیکربندی نشده است.",
      },
      503,
    );
  }

  if (
    !isAuthorized(
      request,
      integrationSecret,
    )
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          "اجازه دسترسی به این سرویس را ندارید.",
      },
      401,
    );
  }

  try {
    const employees =
      await prisma.user.findMany({
        where: {
          role: "EMPLOYEE",
          isActive: true,
        },

        orderBy: [
          {
            firstName: "asc",
          },
          {
            lastName: "asc",
          },
        ],

        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      });

    return jsonResponse({
      success: true,
      employees,
    });
  } catch (error) {
    console.error(
      "Hozorino integration employees API error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message:
          "دریافت فهرست کارمندان انجام نشد.",
      },
      500,
    );
  }
}