"use client";

import { useEffect, useState } from "react";

function getDuration(
  start: Date,
  end: Date,
) {
  const milliseconds = Math.max(
    0,
    end.getTime() - start.getTime(),
  );

  const totalMinutes = Math.floor(
    milliseconds / 60000,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  const seconds = Math.floor(
    (milliseconds % 60000) / 1000,
  );

  return {
    hours,
    minutes,
    seconds,
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export default function EmployeeDuration({
  checkIn,
  checkOut,
}: {
  checkIn: string;
  checkOut?: string | null;
}) {
  const [now, setNow] =
    useState(() => new Date());

  useEffect(() => {
    if (checkOut) {
      return;
    }

    const interval = window.setInterval(
      () => {
        setNow(new Date());
      },
      1000,
    );

    return () =>
      window.clearInterval(interval);
  }, [checkOut]);

  const duration = getDuration(
    new Date(checkIn),
    checkOut
      ? new Date(checkOut)
      : now,
  );

  return (
    <span
      dir="ltr"
      className="font-mono text-2xl font-bold tracking-tight text-slate-950"
    >
      {pad(duration.hours)}:
      {pad(duration.minutes)}:
      {pad(duration.seconds)}
    </span>
  );
}