"use client";

import React, { useState, useEffect, useRef } from "react";
import Hero from "./Hero"; // Import your Hero component

const MENU = [
  { key: "home", label: "Home" },
  { key: "sales", label: "Sales Day Book" },
  { key: "profit", label: "Profit Margin Report" },
  { key: "stock", label: "Stock Ageing Analysis" },
];

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

/** --- Compute previous month/year once (handles Jan -> Dec of prev year) --- **/
const now = new Date();
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const defaultMonth = prev.getMonth() + 1; // 1–12
const defaultYear = prev.getFullYear();
/** ------------------------------------------------------------------------ **/

const currentYear = new Date().getFullYear();
const nfmt = new Intl.NumberFormat("en-IN");

export default function Dashboard() {
  const [active, setActive] = useState("home");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Initialize to previous month/year
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Track last active tab to detect transitions from Home -> Report
  const prevActiveRef = useRef(active);
  useEffect(() => {
    const prevActive = prevActiveRef.current;
    if (prevActive === "home" && active !== "home") {
      setSelectedMonth(defaultMonth);
      setSelectedYear(defaultYear);
    }
    prevActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!active || active === "home") return;
    fetchData(active, selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selectedMonth, selectedYear]);

  const fetchData = async (table, month, year) => {
    const ctrl = new AbortController();
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/dashboard/${table}?month=${month}&year=${year}`,
        { cache: "no-store", signal: ctrl.signal }
      );

      // Read the body ONCE; branch afterwards
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || body?.error || "Failed to load data");
      }

      setRows(Array.isArray(body?.data) ? body.data : []);
    } catch (e) {
      if (e?.name !== "AbortError") {
        setErr(e?.message || "Unexpected error");
        setRows([]);
      }
    } finally {
      setLoading(false);
    }

    // Cleanup if needed (pattern-ready if you later keep ctrl outside)
    return () => ctrl.abort();
  };

  const renderContent = () => {
    if (active === "home") {
      return <Hero />; // Render Hero component on Home
    }

    if (loading) return <p className="text-gray-500">Loading {active}…</p>;
    if (err) return <p className="text-red-500">Error: {err}</p>;
    if (!rows.length) return <p className="text-gray-500">No data found for selected month/year.</p>;

    const columns = getColumns(active, rows[0]);
    return (
      <div className="overflow-x-auto bg-white rounded-md shadow p-3">
        <table className="min-w-full text-sm border border-gray-200">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="border px-3 py-2 bg-gray-50 text-left">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="border px-3 py-2 whitespace-nowrap">
                    {formatCell(row[col.key], col.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
        <div className="flex items-center justify-center py-4">
          <img src="/agasthyalogo.png" alt="Agasthya" className="h-10 object-contain" />
        </div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Reports</h2>
        <nav className="space-y-1">
          {MENU.map((m) => (
            <button
              key={m.key}
              className={`w-full text-left px-3 py-2 rounded-md transition ${
                active === m.key ? "bg-[#C1272D] text-white" : "hover:bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActive(m.key)}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 bg-gray-100">
        {active !== "home" && (
          <div className="flex gap-3 mb-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border px-2 py-1 rounded-md"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border px-2 py-1 rounded-md"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = currentYear - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
}

// ---------- formatters & columns ----------

function formatCell(value, type) {
  if (value == null) return "";
  if (type === "date") {
    const d = new Date(value);
    return isNaN(d) ? "" : d.toLocaleDateString();
  }
  if (type === "currency") {
    const n = Number(value);
    return Number.isFinite(n) ? `₹ ${nfmt.format(n)}` : "";
  }
  return String(value);
}

function getColumns(table, row) {
  if (table === "sales") {
    return [
      { key: "date", label: "Date", type: "date" },
      { key: "voucherName", label: "Voucher Name" },
      { key: "voucher", label: "Voucher No." },
      { key: "customerName", label: "Customer Name" },
      { key: "itemName", label: "Item" },
      { key: "quantity", label: "Quantity" },
      { key: "rate", label: "Rate", type: "currency" },
      { key: "gross", label: "Gross Value", type: "currency" },
      { key: "taxableValue", label: "Taxable Value", type: "currency" },
      { key: "avgPurchasePrice", label: "Avg Purchase Price", type: "currency" },
      { key: "profitMargin", label: "Profit Margin", type: "currency" },
    ];
  }

  if (table === "profit") {
    return [
      { key: "date", label: "Date", type: "date" },
      { key: "customerName", label: "Customer" },
      { key: "docNo", label: "Document No." },
      { key: "itemName", label: "Item" },
      { key: "unitName", label: "Unit" },
      { key: "quantity", label: "Quantity" },
      { key: "rate", label: "Rate", type: "currency" },
      { key: "gross", label: "Gross Value", type: "currency" },
      { key: "taxableValue", label: "Taxable Value", type: "currency" },
      { key: "avgPurchasePrice", label: "Avg Purchase Price", type: "currency" },
      { key: "appGross", label: "APP Gross", type: "currency" },
      { key: "grossProfit", label: "Gross Profit", type: "currency" },
      { key: "gpMarginPct", label: "GP Margin %", type: "currency" },
    ];
  }

  if (table === "stock") {
    return [
      { key: "particulars", label: "Particulars" },
      { key: "warehouse", label: "Warehouse" },
      { key: "totalQty", label: "Total Quantity" },
      { key: "totalValue", label: "Total Value", type: "currency" },
      { key: "q0_30", label: "0-30 Days Qty" },
      { key: "v0_30", label: "0-30 Days Value", type: "currency" },
      { key: "q31_60", label: "31-60 Days Qty" },
      { key: "v31_60", label: "31-60 Days Value", type: "currency" },
      { key: "q61_90", label: "61-90 Days Qty" },
      { key: "v61_90", label: "61-90 Days Value", type: "currency" },
      { key: "q91_120", label: "91-120 Days Qty" },
      { key: "v91_120", label: "91-120 Days Value", type: "currency" },
      { key: "q121_150", label: "121-150 Days Qty" },
      { key: "v121_150", label: "121-150 Days Value", type: "currency" },
      { key: "q151_180", label: "151-180 Days Qty" },
      { key: "v151_180", label: "151-180 Days Value", type: "currency" },
      { key: "q181_360", label: "181-360 Days Qty" },
      { key: "v181_360", label: "181-360 Days Value", type: "currency" },
      { key: "q_gt_360", label: ">360 Days Qty" },
      { key: "v_gt_360", label: ">360 Days Value", type: "currency" },
    ];
  }

  // Fallback: derive columns from the first row
  return Object.keys(row || {}).map((key) => ({ key, label: key }));
}
