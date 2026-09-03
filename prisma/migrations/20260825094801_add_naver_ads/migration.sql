-- CreateTable
CREATE TABLE "NaverAdAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "secretKeyEnc" TEXT NOT NULL,
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "NaverAdAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdAutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "targetLevel" TEXT NOT NULL,
    "naverTargetId" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdAutomationRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "NaverAdAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdRunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "ruleId" TEXT,
    "mode" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailJson" JSONB,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdRunLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "NaverAdAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdRunLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AdAutomationRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdKeywordSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT,
    "keyword" TEXT NOT NULL,
    "monthlyPcSearches" INTEGER,
    "monthlyMobileSearches" INTEGER,
    "competitionLevel" TEXT,
    "avgPcCtr" REAL,
    "avgMobileCtr" REAL,
    "avgAdDepth" REAL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdKeywordSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "NaverAdAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdAutomationRule_accountId_idx" ON "AdAutomationRule"("accountId");

-- CreateIndex
CREATE INDEX "AdRunLog_accountId_idx" ON "AdRunLog"("accountId");

-- CreateIndex
CREATE INDEX "AdRunLog_runAt_idx" ON "AdRunLog"("runAt");

-- CreateIndex
CREATE INDEX "AdKeywordSnapshot_keyword_idx" ON "AdKeywordSnapshot"("keyword");

-- CreateIndex
CREATE INDEX "AdKeywordSnapshot_accountId_idx" ON "AdKeywordSnapshot"("accountId");
