-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "sizeBytes" INTEGER,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesFact" (
    "id" BIGSERIAL NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "voucherName" TEXT,
    "voucher" TEXT,
    "customerName" TEXT,
    "quantity" DECIMAL(18,4),
    "rate" DECIMAL(18,4),
    "gross" DECIMAL(18,4),
    "taxableValue" DECIMAL(18,4),
    "avgPurchasePrice" DECIMAL(18,4),
    "avgPPGross" DECIMAL(18,4),
    "profitMargin" DECIMAL(18,4),
    "itemName" TEXT,

    CONSTRAINT "SalesFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitMarginFact" (
    "id" BIGSERIAL NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT,
    "docNo" TEXT,
    "itemName" TEXT,
    "unitName" TEXT,
    "quantity" DECIMAL(18,4),
    "rate" DECIMAL(18,4),
    "gross" DECIMAL(18,4),
    "taxableValue" DECIMAL(18,4),
    "avgPurchasePrice" DECIMAL(18,4),
    "appGross" DECIMAL(18,4),
    "grossProfit" DECIMAL(18,4),
    "gpMarginPct" DECIMAL(18,4),

    CONSTRAINT "ProfitMarginFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAgeingFact" (
    "id" BIGSERIAL NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "particulars" TEXT,
    "totalQty" DECIMAL(18,4),
    "totalValue" DECIMAL(18,4),
    "q0_30" DECIMAL(18,4),
    "v0_30" DECIMAL(18,4),
    "q31_60" DECIMAL(18,4),
    "v31_60" DECIMAL(18,4),
    "q61_90" DECIMAL(18,4),
    "v61_90" DECIMAL(18,4),
    "q91_120" DECIMAL(18,4),
    "v91_120" DECIMAL(18,4),
    "q121_150" DECIMAL(18,4),
    "v121_150" DECIMAL(18,4),
    "q151_180" DECIMAL(18,4),
    "v151_180" DECIMAL(18,4),
    "q181_360" DECIMAL(18,4),
    "v181_360" DECIMAL(18,4),
    "q_gt_360" DECIMAL(18,4),
    "v_gt_360" DECIMAL(18,4),
    "warehouse" TEXT,

    CONSTRAINT "StockAgeingFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesFact_periodYear_periodMonth_idx" ON "SalesFact"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "ProfitMarginFact_periodYear_periodMonth_idx" ON "ProfitMarginFact"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "ProfitMarginFact_docNo_idx" ON "ProfitMarginFact"("docNo");

-- CreateIndex
CREATE INDEX "StockAgeingFact_periodYear_periodMonth_idx" ON "StockAgeingFact"("periodYear", "periodMonth");
