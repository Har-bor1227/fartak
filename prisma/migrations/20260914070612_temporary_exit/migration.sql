-- CreateEnum
CREATE TYPE "TemporaryExitType" AS ENUM ('TEMPORARY', 'MISSION');

-- CreateEnum
CREATE TYPE "TemporaryExitStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateTable
CREATE TABLE "TemporaryExit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "type" "TemporaryExitType" NOT NULL DEFAULT 'TEMPORARY',
    "status" "TemporaryExitStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryExitAudit" (
    "id" TEXT NOT NULL,
    "temporaryExitId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AttendanceAuditAction" NOT NULL,
    "previousType" "TemporaryExitType",
    "previousStatus" "TemporaryExitStatus",
    "previousStartedAt" TIMESTAMP(3),
    "previousEndedAt" TIMESTAMP(3),
    "previousReason" TEXT,
    "previousNote" TEXT,
    "newType" "TemporaryExitType",
    "newStatus" "TemporaryExitStatus",
    "newStartedAt" TIMESTAMP(3),
    "newEndedAt" TIMESTAMP(3),
    "newReason" TEXT,
    "newNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryExitAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemporaryExit_userId_startedAt_idx" ON "TemporaryExit"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TemporaryExit_attendanceId_startedAt_idx" ON "TemporaryExit"("attendanceId", "startedAt");

-- CreateIndex
CREATE INDEX "TemporaryExit_status_idx" ON "TemporaryExit"("status");

-- CreateIndex
CREATE INDEX "TemporaryExit_type_idx" ON "TemporaryExit"("type");

-- CreateIndex
CREATE INDEX "TemporaryExitAudit_temporaryExitId_createdAt_idx" ON "TemporaryExitAudit"("temporaryExitId", "createdAt");

-- CreateIndex
CREATE INDEX "TemporaryExitAudit_actorId_createdAt_idx" ON "TemporaryExitAudit"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "TemporaryExit" ADD CONSTRAINT "TemporaryExit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryExit" ADD CONSTRAINT "TemporaryExit_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryExitAudit" ADD CONSTRAINT "TemporaryExitAudit_temporaryExitId_fkey" FOREIGN KEY ("temporaryExitId") REFERENCES "TemporaryExit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryExitAudit" ADD CONSTRAINT "TemporaryExitAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
