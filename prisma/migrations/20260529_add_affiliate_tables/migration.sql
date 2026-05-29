-- Migration: add_affiliate_tables
-- Add affiliateBalance to Tenant and create ReferralCommission model

-- 1. Add affiliateBalance to Tenant
ALTER TABLE "Tenant" ADD COLUMN "affiliateBalance" INTEGER NOT NULL DEFAULT 0;

-- 2. Create ReferralCommission table
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "referrerTenantId" TEXT NOT NULL,
    "referredTenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- 3. Add indexes
CREATE INDEX "ReferralCommission_referrerTenantId_idx" ON "ReferralCommission"("referrerTenantId");
CREATE INDEX "ReferralCommission_referredTenantId_idx" ON "ReferralCommission"("referredTenantId");
CREATE INDEX "ReferralCommission_status_idx" ON "ReferralCommission"("status");

-- 4. Add foreign keys
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referrerTenantId_fkey"
    FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referredTenantId_fkey"
    FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
