-- CreateEnum
CREATE TYPE "AttendanceAuditAction" AS ENUM ('CREATE', 'UPDATE');

-- CreateTable
CREATE TABLE "AttendanceAudit" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AttendanceAuditAction" NOT NULL,
    "previousCheckIn" TIMESTAMP(3),
    "previousCheckOut" TIMESTAMP(3),
    "previousStatus" "AttendanceStatus",
    "previousNote" TEXT,
    "newCheckIn" TIMESTAMP(3),
    "newCheckOut" TIMESTAMP(3),
    "newStatus" "AttendanceStatus",
    "newNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceAudit_attendanceId_createdAt_idx" ON "AttendanceAudit"("attendanceId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceAudit_actorId_createdAt_idx" ON "AttendanceAudit"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
