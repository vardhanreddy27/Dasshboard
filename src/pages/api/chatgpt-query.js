// File: pages/api/chatgpt-query.js

import OpenAI from "openai";
import prisma from "@/lib/prisma";

/** ─────────────────────────────────────────────────────────────────────────────
 * Groq client
 * ──────────────────────────────────────────────────────────────────────────── */
const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

/** ─────────────────────────────────────────────────────────────────────────────
 * Allow-list (normalized/lowercase). Your physical tables are mixed-case and
 * must be quoted in SQL ("SalesFact", "ProfitMarginFact", "StockAgeingFact").
 * ──────────────────────────────────────────────────────────────────────────── */
const ALLOWED_TABLES = new Set([
  "salesfact",
  "profitmarginfact",
  "stockageingfact",
]);

/** ─────────────────────────────────────────────────────────────────────────────
 * Schema / Prompt Guidance
 * We REQUIRE quoted identifiers for BOTH table and column names.
 * Prefer "periodMonth"/"periodYear" for time filters.
 * ──────────────────────────────────────────────────────────────────────────── */
const SCHEMA_CONTEXT = `
Tables (PostgreSQL – identifiers are case-sensitive when quoted):

1) "SalesFact"(
  "id", "periodMonth", "periodYear", "date", "voucherName", "voucher", "customerName",
  "itemName", "quantity", "rate", "gross", "taxableValue", "avgPurchasePrice", "avgPPGross", "profitMargin"
)

2) "ProfitMarginFact"(
  "id", "periodMonth", "periodYear", "date", "customerName", "docNo", "itemName", "unitName",
  "quantity", "rate", "gross", "taxableValue", "avgPurchasePrice", "appGross", "grossProfit", "gpMarginPct"
)

3) "StockAgeingFact"(
  "id", "periodMonth", "periodYear", "warehouse", "particulars", "totalQty", "totalValue",
  "q0_30", "v0_30", "q31_60", "v31_60", "q61_90", "v61_90", "q91_120", "v91_120",
  "q121_150", "v121_150", "q151_180", "v151_180", "q181_360", "v181_360", "q_gt_360", "v_gt_360"
)

Rules:
- ALWAYS wrap table names AND column names in double quotes exactly as shown.
- Prefer filtering by "periodMonth" / "periodYear" (not EXTRACT on "date").
- If the user specifies a month name and/or a year (e.g., "July 2025"), convert month → 1..12
  and include WHERE "periodMonth" = <m> AND "periodYear" = <y>.
- For "this month" / "previous month", use the provided temporal hints.
- Return ONLY ONE valid PostgreSQL SELECT statement. No prose. No code fences.
- Provide explicit aliases for aggregates (e.g., AS total_sales, AS total_profit).
`;

/** ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */
function stripCodeFences(s) {
  if (!s) return s;
  return s.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "")).trim();
}

function isReadOnly(sql) {
  const bad = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create)\b/i;
  return !bad.test(sql);
}

/** Extract table names after FROM/JOIN, handle quoted/unquoted, lowercased */
function extractTablesNormalized(sql) {
  const names = [];
  const regex = /\b(?:from|join)\s+(?:"([a-zA-Z_][a-zA-Z0-9_]*)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    const t = (m[1] || m[2] || "").toLowerCase();
    if (t) names.push(t);
  }
  return Array.from(new Set(names));
}

/** Ensure LIMIT present */
function ensureLimit(sql) {
  if (!/\blimit\s+\d+\b/i.test(sql)) return sql.replace(/;?\s*$/i, " LIMIT 200;");
  return sql.endsWith(";") ? sql : sql + ";";
}

/** Month/year parser from NL (e.g., "July 2025") */
function parseMonthYearFromText(text) {
  if (!text) return {};
  const lower = text.toLowerCase();
  const months = {
    january:1, jan:1, february:2, feb:2, march:3, mar:3, april:4, apr:4, may:5,
    june:6, jun:6, july:7, jul:7, august:8, aug:8, september:9, sep:9, sept:9,
    october:10, oct:10, november:11, nov:11, december:12, dec:12,
  };
  let month;
  for (const k of Object.keys(months)) {
    if (new RegExp(`\\b${k}\\b`, "i").test(text)) { month = months[k]; break; }
  }
  const yMatch = lower.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yMatch ? parseInt(yMatch[1], 10) : undefined;
  return { month, year };
}

/** Shape single-row/single-column into KPI object */
function shapeKpiResult(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const keys = Object.keys(rows[0] || {});
  if (keys.length !== 1) return null;
  return { [keys[0]]: rows[0][keys[0]] };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: "Missing question in body" });

    // Temporal hints for relative queries
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const hints = `Today=${now.toISOString().slice(0,10)}; thisMonth=${now.getMonth()+1}; thisYear=${now.getFullYear()}; prevMonth=${prev.getMonth()+1}; prevYear=${prev.getFullYear()};`;

    // Parse explicit month/year if present (e.g., "July 2025")
    const { month: askedMonth, year: askedYear } = parseMonthYearFromText(question);

    /** 1) Ask LLM for SQL */
    const systemMsg = [
      `You convert natural language to SQL for our BI app.`,
      SCHEMA_CONTEXT,
      hints,
      askedMonth && askedYear
        ? `User explicitly asked for month=${askedMonth} and year=${askedYear}. Include WHERE "periodMonth"=${askedMonth} AND "periodYear"=${askedYear}.`
        : `If month/year are mentioned, include WHERE "periodMonth"=<m> AND "periodYear"=<y>.`,
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      temperature: 0,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: `Return ONLY a single SELECT statement for: ${question}` },
      ],
    });

    let sql = completion.choices?.[0]?.message?.content || "";
    sql = stripCodeFences(sql).trim();

    if (!sql) return res.status(500).json({ message: "LLM returned empty SQL." });
    if (!/^\s*select\b/i.test(sql)) return res.status(400).json({ message: "Non-SELECT SQL rejected.", sql });
    if (!isReadOnly(sql)) return res.status(400).json({ message: "Only read-only queries are allowed.", sql });

    // 2) Guardrails: validate tables
    const tables = extractTablesNormalized(sql);
    if (tables.length === 0) return res.status(400).json({ message: "No table found in SQL.", sql });
    for (const t of tables) {
      if (!ALLOWED_TABLES.has(t)) return res.status(400).json({ message: `Table '${t}' is not allowed.`, sql });
    }

    // 3) Ensure LIMIT
    sql = ensureLimit(sql);

    // 4) Execute against Neon via Prisma
    const rows = await prisma.$queryRawUnsafe(sql);

    // BigInt → string for JSON
    const resultRows = JSON.parse(
      JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    );

    // 5) Auto-shape single aggregate as KPI object
    const kpi = shapeKpiResult(resultRows);

    return res.status(200).json({
      result: kpi ?? resultRows,
      sql,            // transparency/debug
      query: question // original NL prompt
    });
  } catch (error) {
    const status = error?.status || 500;
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown error";
    console.error("chatgpt-query error:", message);
    return res.status(status).json({ message });
  }
}
