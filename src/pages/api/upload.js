import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

function toNumber(val) {
  if (val == null || val === "" || isNaN(val)) return 0;
  return Number(val);
}

function parseExcelDate(excelValue) {
  if (!excelValue) return null;
  if (typeof excelValue === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setDate(epoch.getDate() + excelValue);
    return epoch;
  }
  const parsed = new Date(excelValue);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function detectReportFromFilename(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.startsWith("sales_day_book")) return "sales";
  if (lower.startsWith("profit_margin_report")) return "profit";
  if (lower.startsWith("stock_ageing_analysis")) return "stock";
  return "unknown";
}

function cleanRows(rows, reportType) {
  let startIndex = 0;
  const headerKey =
    reportType === "sales" || reportType === "profit" ? "Date" : "Particulars";

  for (let i = 0; i < rows.length; i++) {
    if (Object.values(rows[i]).includes(headerKey)) {
      startIndex = i + 1;
      break;
    }
  }

  let validRows = rows.slice(startIndex);

  if (validRows.length) {
    const lastRowValues = Object.values(validRows[validRows.length - 1])
      .join(" ")
      .toLowerCase();
    if (lastRowValues.includes("total")) {
      validRows.pop();
    }
  }

  return validRows;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const form = formidable({});
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const month = Number(fields.month);
    const year = Number(fields.year);
    let totalRowsInserted = 0;
    const allFiles = Array.isArray(files.files) ? files.files : [files.files];

    for (const file of allFiles) {
      const reportType = detectReportFromFilename(file.originalFilename);
      const buffer = await fs.promises.readFile(file.filepath);
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      const headers = rows.find((row) =>
        row.includes(reportType === "stock" ? "Particulars" : "Date")
      );
      rows = rows.slice(rows.indexOf(headers) + 1);
      rows = rows.map((r) =>
        headers.reduce((acc, key, idx) => {
          acc[key] = r[idx];
          return acc;
        }, {})
      );

      rows = cleanRows(rows, reportType);
      if (rows.length === 0) continue;

      if (reportType === "sales") {
        const salesData = rows.map((r) => ({
          periodMonth: month,
          periodYear: year,
          date: parseExcelDate(r["Date"]) || new Date(),
          voucherName: r["Voucher name"] || null,
          voucher: r["Voucher"] || null,
          customerName: r["Customer Account Name"] || null,
          quantity: toNumber(r["Quantity"]),
          rate: toNumber(r["Rate"]),
          gross: toNumber(r["Gross"]),
          taxableValue: toNumber(r["Taxable Value"]),
          avgPurchasePrice: toNumber(r["Avg Purchase Price"]),
          avgPPGross: toNumber(r["AVG PP Gross"]),
          profitMargin: toNumber(r["Profit Margin"]),
          itemName: r["Item Name"] || null,
        }));

        await prisma.salesFact.createMany({ data: salesData, skipDuplicates: true });
        totalRowsInserted += salesData.length;
      } else if (reportType === "profit") {
        const profitData = rows.map((r) => ({
          periodMonth: month,
          periodYear: year,
          date: parseExcelDate(r["Date"]) || new Date(),
          customerName: r["CustomerAC.Name"] || null,
          docNo: r["DocNo"] || null,
          itemName: r["Item.Name"] || null,
          unitName: r["Unit.Name"] || null,
          quantity: toNumber(r["Quantity"]),
          rate: toNumber(r["Rate"]),
          gross: toNumber(r["Gross"]),
          taxableValue: toNumber(r["Taxable Value"]),
          avgPurchasePrice: toNumber(r["Avg Purchase Price"]),
          appGross: toNumber(r["APP Gross"]),
          grossProfit: toNumber(r["Gross Profit "]) || toNumber(r["Gross Profit"]),
          gpMarginPct: toNumber(String(r["GP Margin%"] || "").replace("%", "")),
        }));

        await prisma.profitMarginFact.createMany({ data: profitData, skipDuplicates: true });
        totalRowsInserted += profitData.length;
      } else if (reportType === "stock") {
        const stockData = rows.map((r) => ({
          periodMonth: month,
          periodYear: year,
          particulars: r["Particulars"] || null,
          totalQty: toNumber(r["Total Quantity"]),
          totalValue: toNumber(r["Total Value"]),
          q0_30: toNumber(r["0-30 Quantity"]),
          v0_30: toNumber(r["0-30 Value"]),
          q31_60: toNumber(r["31-60 Quantity"]),
          v31_60: toNumber(r["31-60 Value"]),
          q61_90: toNumber(r["61-90 Quantity"]),
          v61_90: toNumber(r["61-90 Value"]),
          q91_120: toNumber(r["91-120 Quantity"]),
          v91_120: toNumber(r["91-120 Value"]),
          q121_150: toNumber(r["121-150 Quantity"]),
          v121_150: toNumber(r["121-150 Value"]),
          q151_180: toNumber(r["151-180 Quantity"]),
          v151_180: toNumber(r["151-180 Value"]),
          q181_360: toNumber(r["181-360 Quantity"]),
          v181_360: toNumber(r["181-360 Value"]),
          q_gt_360: toNumber(r["> 360 Quantity"]),
          v_gt_360: toNumber(r["> 360 Value"]),
          warehouse: r["Warehouse"] || null,
        }));

        await prisma.stockAgeingFact.createMany({ data: stockData, skipDuplicates: true });
        totalRowsInserted += stockData.length;
      }
    }

    return res.status(200).json({ rowsInserted: totalRowsInserted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
