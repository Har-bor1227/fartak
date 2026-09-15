
"use client";

import {
  useEffect,
  useState,
} from "react";

function getDuration(
  start: Date,
  end: Date,
) {
  const milliseconds = Math.max(
    0,
    end.getTime() -
      start.getTime(),
  );

  const totalMinutes =
    Math.floor(
      milliseconds / 60000,
    );

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  const seconds =
    Math.floor(
      (milliseconds % 60000) /
        1000,
    );

  return {
    hours,
    minutes,
    seconds,
  };
}

function pad(value: number) {
  return value
    .toString()
    .padStart(2, "0");
}

export default function EmployeeDuration({
  checkIn,
  checkOut,
}: {
  checkIn: string;
  checkOut?: string | null;
}) {
  const [now, setNow] =
    useState<Date | null>(null);

  useEffect(() => {
    const current = new Date();

    setNow(current);

    if (checkOut) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [checkOut]);

  const end =
    checkOut
      ? new Date(checkOut)
      : now;

  const duration = end
    ? getDuration(
        new Date(checkIn),
        end,
      )
    : {
        hours: 0,
        minutes: 0,
        seconds: 0,
      };

  return (
    <span
      dir="ltr"
      aria-label="مدت حضور"
      className="
        inline-flex
        items-baseline
        rounded-xl
        text-2xl
        font-bold
        tracking-tight
        text-white
        sm:text-[26px]
      "
    >
      <span className="font-mono tabular-nums">
        {pad(duration.hours)}
      </span>

      <span className="mx-0.5 text-slate-500">
        :
      </span>

      <span className="font-mono tabular-nums">
        {pad(duration.minutes)}
      </span>

      <span className="mx-0.5 text-slate-500">
        :
      </span>

      <span className="font-mono tabular-nums">
        {pad(duration.seconds)}
      </span>
    </span>
  );
}

