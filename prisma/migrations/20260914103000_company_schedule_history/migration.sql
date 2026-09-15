CREATE TABLE "CompanyScheduleHistory" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "workStartMinutes" INTEGER NOT NULL,
    "workEndMinutes" INTEGER NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "monday" BOOLEAN NOT NULL,
    "tuesday" BOOLEAN NOT NULL,
    "wednesday" BOOLEAN NOT NULL,
    "thursday" BOOLEAN NOT NULL,
    "friday" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyScheduleHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyScheduleHistory_effectiveFrom_key"
ON "CompanyScheduleHistory"("effectiveFrom");

CREATE INDEX "CompanyScheduleHistory_effectiveFrom_idx"
ON "CompanyScheduleHistory"("effectiveFrom");

INSERT INTO "CompanyScheduleHistory" (
    "id",
    "effectiveFrom",
    "workStartMinutes",
    "workEndMinutes",
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "createdAt"
)
SELECT
    'company-schedule-initial',
    timezone(
        'Asia/Tehran',
        date_trunc(
            'day',
            timezone(
                'Asia/Tehran',
                "createdAt"
            )
        )
    )::timestamp(3),
    "workStartMinutes",
    "workEndMinutes",
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    CURRENT_TIMESTAMP
FROM "CompanySettings"
WHERE "id" = 'company';