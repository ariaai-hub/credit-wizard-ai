-- Migration: add_letter_download_counter
-- Add letter download tracking for Starter plan limits

ALTER TABLE "Tenant" ADD COLUMN "letterDownloadsThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "lastDownloadMonth" TEXT;
