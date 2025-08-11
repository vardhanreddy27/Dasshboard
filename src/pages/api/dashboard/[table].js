import prisma from "@/lib/prisma";

const TABLE_MAP = {
  sales: "salesFact",
  profit: "profitMarginFact",
  stock: "stockAgeingFact",
};

// Fix Excel-like numeric date serials (if present)
function fixDate(d) {
  if (!d) return null;

  if (typeof d === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setDate(epoch.getDate() + d);
    return epoch.toISOString();
  }

  if (typeof d === "string" || d instanceof Date) {
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

// Normalize row dates
function normalizeDates(table, data) {
  if (!["sales", "profit"].includes(table)) return data;

  const dateKey = "date";

  return data.map((row) => {
    if (row[dateKey]) {
      return { ...row, [dateKey]: fixDate(row[dateKey]) };
    }
    return row;
  });
}

// BigInt safe JSON
const jsonBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export default async function handler(req, res) {
  try {
    const { table, month, year } = req.query;

    const model = TABLE_MAP[table];
    if (!model) {
      return res.status(400).json({ message: "Unknown table. Use sales | profit | stock" });
    }

    const where = {};
    if (month) where.periodMonth = Number(month);
    if (year) where.periodYear = Number(year);

    const orderBy =
      table === "stock"
        ? [{ periodYear: "desc" }, { periodMonth: "desc" }, { id: "desc" }]
        : [{ date: "asc" }];

    let data = await prisma[model].findMany({ where, orderBy });

    // Fix dates before sending
    data = normalizeDates(table, data);

    return res.status(200).json(jsonBigInt({ data }));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
