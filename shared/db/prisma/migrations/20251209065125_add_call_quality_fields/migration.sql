-- AlterTable
ALTER TABLE "recording" ADD COLUMN     "callQuality" TEXT,
ADD COLUMN     "callQualityReason" TEXT;

-- AlterTable
ALTER TABLE "task_instance" ADD COLUMN     "appointmentTime" TIMESTAMP(3),
ADD COLUMN     "bookingCancelReason" TEXT,
ADD COLUMN     "bookingCancelledAt" TIMESTAMP(3),
ADD COLUMN     "bookingStatus" TEXT,
ADD COLUMN     "calcomBookingId" TEXT,
ADD COLUMN     "calcomEventId" INTEGER,
ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "estimatedValue" DOUBLE PRECISION,
ADD COLUMN     "leadScore" INTEGER,
ADD COLUMN     "leadType" TEXT,
ADD COLUMN     "pipelineStage" TEXT DEFAULT 'new',
ADD COLUMN     "resolutionType" TEXT,
ADD COLUMN     "tags" JSONB;
