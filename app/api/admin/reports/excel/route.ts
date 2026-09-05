import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getEmployeeReport,
  normalizeDateInput,
} from "@/lib/admin/reports";
import {
  formatDate,
  formatTime,
  getDateKey,
} from "@/lib/date/tehran";

function formatMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes <= 0) {
    return "0 دقیقه";
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} دقیقه`;
  }

  if (minutes === 0) {
    return `${hours} ساعت`;
  }

  return `${hours} ساعت و ${minutes} دقیقه`;
}

function formatSignedMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes === 0) {
    return "0 دقیقه";
  }

  const absolute =
    Math.abs(totalMinutes);

  const value =
    formatMinutes(absolute);

  return totalMinutes > 0
    ? `+${value}`
    : `-${value}`;
}

function getStateText(
  state: string,
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "در حال کار";

    case "ABSENT":
      return "غایب";

    case "HOLIDAY":
      return "تعطیل";

    case "NON_WORKING":
      return "غیرکاری";

    case "FUTURE":
      return "آینده";

    default:
      return "نامشخص";
  }
}

export async function GET(
  request: Request,
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "احراز هویت لازم است.",
        },
        {
          status: 401,
        },
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "دسترسی غیرمجاز است.",
        },
        {
          status: 403,
        },
      );
    }

    const url =
      new URL(request.url);

    const employeeId =
      url.searchParams.get(
        "employee",
      ) || "";

    const from =
      normalizeDateInput(
        url.searchParams.get(
          "from",
        ) || undefined,
      );

    const to =
      normalizeDateInput(
        url.searchParams.get(
          "to",
        ) || undefined,
      );

    if (
      !employeeId ||
      !from ||
      !to ||
      from > to
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "پارامترهای گزارش معتبر نیستند.",
        },
        {
          status: 400,
        },
      );
    }

    const report =
      await getEmployeeReport({
        employeeId,
        from,
        to,
      });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          message:
            "گزارشی برای کارمند موردنظر پیدا نشد.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * جزئیات Excel مستقیماً از calculation
     * موتور حضور و غیاب خوانده می‌شود.
     *
     * بنابراین Excel و صفحه گزارش
     * دقیقاً یک منطق محاسباتی دارند.
     */
    const rows =
      report.items.map(
        (item) => {
          const calculation =
            item.calculation;

          return {
            تاریخ: formatDate(
              item.workDate,
            ),

            "تاریخ میلادی":
              getDateKey(
                item.workDate,
              ),

            ورود: formatTime(
              calculation.checkIn,
            ),

            خروج: formatTime(
              calculation.checkOut,
            ),

            "کارکرد":
              formatMinutes(
                calculation.workedMinutes,
              ),

            "موظفی":
              formatMinutes(
                calculation.scheduledMinutes,
              ),

            "تراز":
              formatSignedMinutes(
                calculation.balanceMinutes,
              ),

            "تأخیر":
              formatMinutes(
                calculation.lateMinutes,
              ),

            "تعجیل خروج":
              formatMinutes(
                calculation.earlyLeaveMinutes,
              ),

            "اضافه‌کاری":
              formatMinutes(
                calculation.overtimeMinutes,
              ),

            "کسری کار":
              formatMinutes(
                calculation.underworkMinutes,
              ),

            وضعیت:
              getStateText(
                calculation.state,
              ),

            "عنوان تعطیلی":
              calculation.holiday
                ?.title || "—",

            توضیحات:
              calculation.note || "—",
          };
        },
      );

    const summaryRows = [
      {
        شاخص: "کارمند",
        مقدار:
          `${report.employee.firstName} ${report.employee.lastName}`,
      },

      {
        شاخص: "نام کاربری",
        مقدار:
          report.employee
            .username,
      },

      {
        شاخص: "وضعیت کارمند",
        مقدار:
          report.employee
            .isActive
            ? "فعال"
            : "غیرفعال",
      },

      {
        شاخص: "از تاریخ",
        مقدار: report.from,
      },

      {
        شاخص: "تا تاریخ",
        مقدار: report.to,
      },

      {
        شاخص: "روزهای حضور",
        مقدار:
          report.attendanceDays,
      },

      {
        شاخص: "روزهای کامل",
        مقدار:
          report.completedDays,
      },

      {
        شاخص: "روزهای ناقص",
        مقدار:
          report.incompleteDays,
      },

      {
        شاخص: "روزهای غیبت",
        مقدار:
          report.absentDays,
      },

      {
        شاخص: "روزهای تعطیل",
        مقدار:
          report.holidayDays,
      },

      {
        شاخص: "روزهای غیرکاری",
        مقدار:
          report.nonWorkingDays,
      },

      {
        شاخص: "روزهای آینده",
        مقدار:
          report.futureDays,
      },

      {
        شاخص: "کارکرد کل",
        مقدار:
          formatMinutes(
            report.totalWorkedMinutes,
          ),
      },

      {
        شاخص: "موظفی کل",
        مقدار:
          formatMinutes(
            report.totalScheduledMinutes,
          ),
      },

      {
        شاخص: "تراز کل",
        مقدار:
          formatSignedMinutes(
            report.totalBalanceMinutes,
          ),
      },

      {
        شاخص: "مجموع تأخیر",
        مقدار:
          formatMinutes(
            report.totalLateMinutes,
          ),
      },

      {
        شاخص: "مجموع تعجیل خروج",
        مقدار:
          formatMinutes(
            report.totalEarlyLeaveMinutes,
          ),
      },

      {
        شاخص: "مجموع اضافه‌کاری",
        مقدار:
          formatMinutes(
            report.totalOvertimeMinutes,
          ),
      },

      {
        شاخص: "مجموع کسری کار",
        مقدار:
          formatMinutes(
            report.totalUnderworkMinutes,
          ),
      },

      {
        شاخص: "میانگین روزانه",
        مقدار:
          formatMinutes(
            report.averageWorkedMinutes,
          ),
      },

      {
        شاخص: "اولین ورود",
        مقدار:
          report.firstCheckIn
            ? formatTime(
                report.firstCheckIn,
              )
            : "—",
      },

      {
        شاخص: "آخرین خروج",
        مقدار:
          report.lastCheckOut
            ? formatTime(
                report.lastCheckOut,
              )
            : "—",
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows,
      );

    const detailSheet =
      XLSX.utils.json_to_sheet(
        rows,
      );

    summarySheet["!cols"] = [
      {
        wch: 25,
      },
      {
        wch: 34,
      },
    ];

    detailSheet["!cols"] = [
      {
        wch: 18,
      },
      {
        wch: 16,
      },
      {
        wch: 12,
      },
      {
        wch: 12,
      },
      {
        wch: 18,
      },
      {
        wch: 18,
      },
      {
        wch: 18,
      },
      {
        wch: 16,
      },
      {
        wch: 18,
      },
      {
        wch: 18,
      },
      {
        wch: 18,
      },
      {
        wch: 18,
      },
      {
        wch: 22,
      },
      {
        wch: 30,
      },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "خلاصه گزارش",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      detailSheet,
      "جزئیات حضور",
    );

    const buffer =
      XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

    const safeName =
      `${report.employee.firstName}-${report.employee.lastName}`
        .replace(
          /[\\/:*?"<>|]/g,
          "-",
        );

    const filename =
      `attendance-${safeName}-${report.from}-${report.to}.xlsx`;

    return new NextResponse(
      buffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename*=UTF-8''${encodeURIComponent(
              filename,
            )}`,

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Excel report export error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "ساخت فایل Excel انجام نشد.",
      },
      {
        status: 500,
      },
    );
  }
}