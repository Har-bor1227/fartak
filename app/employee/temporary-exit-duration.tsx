"use client";

import {
  useEffect,
  useState,
} from "react";

function formatDuration(
  milliseconds: number,
): string {
  const totalMinutes = Math.max(
    0,
    Math.floor(
      milliseconds / 60000,
    ),
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  const seconds = Math.floor(
    (milliseconds % 60000) / 1000,
  );

  if (hours > 0) {
    return `${hours.toLocaleString(
      "fa-IR",
    )} ساعت و ${minutes.toLocaleString(
      "fa-IR",
    )} دقیقه`;
  }

  if (minutes > 0) {
    return `${minutes.toLocaleString(
      "fa-IR",
    )} دقیقه و ${seconds.toLocaleString(
      "fa-IR",
    )} ثانیه`;
  }

  return `${seconds.toLocaleString(
    "fa-IR",
  )} ثانیه`;
}

export default function TemporaryExitDuration({
  startedAt,
}: {
  startedAt: string;
}) {
  const [now, setNow] =
    useState<Date | null>(null);

  useEffect(() => {
    const current = new Date();

    setNow(current);

    const interval =
      window.setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  const start =
    new Date(startedAt);

  const duration =
    now && Number.isFinite(
      start.getTime(),
    )
      ? formatDuration(
          now.getTime() -
            start.getTime(),
        )
      : "در حال محاسبه...";

  return (
    <span className="font-semibold text-amber-700">
      {duration}
    </span>
  );
}