import {
  ArrowRightLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import {
  formatTime,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

import TemporaryExitActions from "./temporary-exit-actions";
import TemporaryExitDuration from "./temporary-exit-duration";

type TemporaryExitPanelProps = {
  attendanceId: string;
};

function getTypeLabel(
  type: string,
): string {
  switch (type) {
    case "MISSION":
      return "مأموریت";

    case "TEMPORARY":
    default:
      return "خروج موقت";
  }
}

function getTypeIcon(
  type: string,
) {
  return type === "MISSION"
    ? BriefcaseBusiness
    : ArrowRightLeft;
}

function formatMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes <= 0) {
    return "۰ دقیقه";
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes.toLocaleString(
      "fa-IR",
    )} دقیقه`;
  }

  if (minutes === 0) {
    return `${hours.toLocaleString(
      "fa-IR",
    )} ساعت`;
  }

  return `${hours.toLocaleString(
    "fa-IR",
  )} ساعت و ${minutes.toLocaleString(
    "fa-IR",
  )} دقیقه`;
}

export default async function TemporaryExitPanel({
  attendanceId,
}: TemporaryExitPanelProps) {
  const exits =
    await prisma.temporaryExit.findMany({
      where: {
        attendanceId,
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        startedAt: true,
        endedAt: true,
        reason: true,
      },
    });

  const openExit =
    exits.find(
      (exit) =>
        exit.status === "OPEN",
    ) ?? null;

  const completedExits =
    exits.filter(
      (exit) =>
        exit.status ===
          "COMPLETED" &&
        exit.endedAt,
    );

  const totalTemporaryExitMinutes =
    completedExits.reduce(
      (total, exit) => {
        if (!exit.endedAt) {
          return total;
        }

        const minutes = Math.floor(
          (exit.endedAt.getTime() -
            exit.startedAt.getTime()) /
            60000,
        );

        return total + Math.max(
          0,
          minutes,
        );
      },
      0,
    );

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ArrowRightLeft
                size={20}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-950">
                خروج موقت و مأموریت
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                خروج‌های بین روز را ثبت و وضعیت بازگشت را مدیریت کنید.
              </p>
            </div>
          </div>

          {completedExits.length >
          0 ? (
            <div className="shrink-0 rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
              مجموع:{" "}
              {formatMinutes(
                totalTemporaryExitMinutes,
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <TemporaryExitActions
          hasOpenExit={Boolean(
            openExit,
          )}
        />

        {openExit ? (
          <div className="mt-4 rounded-[22px] border border-amber-200/80 bg-amber-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock3 size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900">
                    {getTypeLabel(
                      openExit.type,
                    )}
                  </p>

                  <p className="mt-1 text-[10px] text-amber-700/70">
                    شروع:{" "}
                    {formatTime(
                      openExit.startedAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-left">
                <p className="text-[9px] font-medium text-amber-700/60">
                  مدت خروج
                </p>

                <p className="mt-1 text-xs">
                  <TemporaryExitDuration
                    startedAt={openExit.startedAt.toISOString()}
                  />
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {completedExits.length >
        0 ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2
                size={15}
                className="text-emerald-500"
              />

              <p className="text-[11px] font-bold text-slate-700">
                خروج‌های ثبت‌شده امروز
              </p>
            </div>

            <div className="space-y-2">
              {completedExits.map(
                (exit) => {
                  const Icon =
                    getTypeIcon(
                      exit.type,
                    );

                  const durationMinutes =
                    exit.endedAt
                      ? Math.max(
                          0,
                          Math.floor(
                            (exit.endedAt.getTime() -
                              exit.startedAt.getTime()) /
                              60000,
                          ),
                        )
                      : 0;

                  return (
                    <div
                      key={exit.id}
                      className="rounded-2xl bg-slate-50 px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                            <Icon
                              size={15}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-slate-700">
                              {getTypeLabel(
                                exit.type,
                              )}
                            </p>

                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {formatTime(
                                exit.startedAt,
                              )}{" "}
                              تا{" "}
                              {exit.endedAt
                                ? formatTime(
                                    exit.endedAt,
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                          {formatMinutes(
                            durationMinutes,
                          )}
                        </span>
                      </div>

                      {exit.reason ? (
                        <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-[10px] leading-5 text-slate-500">
                          {exit.reason}
                        </p>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}