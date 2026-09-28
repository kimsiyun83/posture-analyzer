CREATE TABLE "TrafficVisit" (
  "id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "pageViews" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrafficVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrafficVisit_day_visitorHash_idx" ON "TrafficVisit"("day", "visitorHash");
CREATE TABLE "TrafficCollection" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrafficCollection_pkey" PRIMARY KEY ("id")
);
INSERT INTO "TrafficCollection" ("id") VALUES ('main');
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "CustomerRecord_createdAt_idx" ON "CustomerRecord"("createdAt");
