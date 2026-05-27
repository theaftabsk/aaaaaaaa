-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappBizAddress" TEXT,
ADD COLUMN     "whatsappBizEmail" TEXT,
ADD COLUMN     "whatsappBizIndustry" TEXT,
ADD COLUMN     "whatsappBizName" TEXT DEFAULT 'Aftab Sk',
ADD COLUMN     "whatsappBizStatus" TEXT DEFAULT 'Available',
ADD COLUMN     "whatsappBizWebsite" TEXT,
ADD COLUMN     "whatsappCallbackPermission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappHoursConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappReceiveCalls" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappShowCallIcon" BOOLEAN NOT NULL DEFAULT false;
