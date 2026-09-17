CREATE TABLE "Customer" ("id" TEXT NOT NULL PRIMARY KEY,"email" TEXT NOT NULL,"name" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE TABLE "CustomerRecord" ("id" TEXT NOT NULL PRIMARY KEY,"customerId" TEXT NOT NULL,"clientId" TEXT NOT NULL,"kind" TEXT NOT NULL,"data" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CustomerRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "CustomerRecord_customerId_clientId_key" ON "CustomerRecord"("customerId","clientId");
CREATE INDEX "CustomerRecord_customerId_createdAt_idx" ON "CustomerRecord"("customerId","createdAt");
CREATE TABLE "PortalSettings" ("id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',"signupEnabled" BOOLEAN NOT NULL DEFAULT true,"cameraEnabled" BOOLEAN NOT NULL DEFAULT true,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "PortalRateLimit" ("key" TEXT NOT NULL PRIMARY KEY,"count" INTEGER NOT NULL,"resetAt" TIMESTAMP(3) NOT NULL);
