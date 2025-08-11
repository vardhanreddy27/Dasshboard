"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { FaChartLine, FaWarehouse, FaBoxes } from "react-icons/fa";
import { IoBagCheck } from "react-icons/io5";

const COLORS = ["#2E7D32", "#FF9800", "#03A9F4", "#C1272D", "#9C27B0", "#607D8B", "#795548"];

const REPORT_TABS = [
  { key: "sales", label: "Sales Day Book" },
  { key: "profit", label: "Profit Margin Report" },
  { key: "stock", label: "Stock Ageing Analysis" },
];

export default function Hero() {
  // --- Default to previous month/year ---
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [selectedMonth, setSelectedMonth] = useState(prev.getMonth() + 1); // 1–12
  const [selectedYear, setSelectedYear] = useState(prev.getFullYear());
  // --------------------------------------

  const [kpis, setKpis] = useState({
    totalSales: "₹0",
    totalProfit: "₹0",
    totalQuantity: "0",
    topCustomer: "N/A",
  });

  const [stockSplit, setStockSplit] = useState([]);
  const [stockFreshness, setStockFreshness] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Reports menu state ---
  const [activeReport, setActiveReport] = useState("sales");
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportErr, setReportErr] = useState(null);

  // Formatters
  const nfmt = useMemo(() => new Intl.NumberFormat("en-IN"), []);
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ---------- Existing KPI & charts fetch ----------
  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const [salesRes, profitRes, stockRes] = await Promise.all([
          fetch(`/api/dashboard/sales?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" }),
          fetch(`/api/dashboard/profit?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" }),
          fetch(`/api/dashboard/stock?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" }),
        ]);

        const salesData = await salesRes.json();
        const profitData = await profitRes.json();
        const stockData = await stockRes.json();

        const totalSales = Array.isArray(salesData.data)
          ? salesData.data.reduce((sum, row) => sum + (parseFloat(row.gross) || 0), 0)
          : 0;

        const totalProfit = Array.isArray(profitData.data)
          ? profitData.data.reduce((sum, row) => sum + (parseFloat(row.grossProfit) || 0), 0)
          : 0;

        const totalQuantity = Array.isArray(stockData.data)
          ? stockData.data.reduce((sum, row) => sum + (parseFloat(row.totalQty) || 0), 0)
          : 0;

        const customerSalesMap = {};
        const categoryMap = {};

        (Array.isArray(salesData.data) ? salesData.data : []).forEach((row) => {
          const customer = row?.customerName || "Unknown";
          const item = row?.itemName || "Unknown";
          const gross = parseFloat(row?.gross) || 0;

          customerSalesMap[customer] = (customerSalesMap[customer] || 0) + gross;
          categoryMap[item] = (categoryMap[item] || 0) + gross;
        });

        const topCustomer =
          Object.entries(customerSalesMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

        const topCategoryArr = Object.entries(categoryMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([item, value]) => ({ name: item, value }));

        const stockRows = Array.isArray(stockData.data) ? stockData.data : [];
        const stockSplitProcessed = [
          { name: "0-30 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v0_30) || 0), 0) },
          { name: "31-60 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v31_60) || 0), 0) },
          { name: "61-90 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v61_90) || 0), 0) },
          { name: "91-120 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v91_120) || 0), 0) },
          { name: "121-150 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v121_150) || 0), 0) },
          { name: "151-180 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v151_180) || 0), 0) },
          { name: "181-360 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v181_360) || 0), 0) },
          { name: ">360 Days", value: stockRows.reduce((sum, r) => sum + (parseFloat(r.v_gt_360) || 0), 0) },
        ];

        const freshnessSummary = [
          { name: "Fresh (≤ 120 Days)", value: stockSplitProcessed.slice(0, 4).reduce((a, b) => a + (b.value || 0), 0) },
          { name: "Old Stock (> 120 D)", value: stockSplitProcessed.slice(4).reduce((a, b) => a + (b.value || 0), 0) },
        ];

        setKpis({
          totalSales: `₹${nfmt.format(totalSales)}`,
          totalProfit: `₹${nfmt.format(totalProfit)}`,
          totalQuantity: nfmt.format(totalQuantity),
          topCustomer,
        });

        setStockSplit(stockSplitProcessed);
        setStockFreshness(freshnessSummary);
        setTopCategories(topCategoryArr);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch KPIs", error);
        setLoading(false);
      }
    };

    const fetchTopCustomers = async () => {
      try {
        const res = await fetch(`/api/dashboard/top-customers?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" });
        const data = await res.json();
        setTopCustomers(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch top customers", err);
        setTopCustomers([]);
      }
    };

    fetchKpis();
    fetchTopCustomers();
  }, [selectedMonth, selectedYear, nfmt]);

  // ---------- Reports menu fetch ----------
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setReportLoading(true);
        setReportErr(null);
        const res = await fetch(`/api/dashboard/${activeReport}?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || json?.error || "Failed to load report");
        setReportRows(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        setReportErr(e?.message || "Unexpected error");
        setReportRows([]);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
  }, [activeReport, selectedMonth, selectedYear]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading dashboard…</p>;
  }

  return (
    <div className="py-10 px-4 space-y-10 rounded-lg">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#1B2E59] mb-2">Welcome to Agasthya Dashboard</h1>
        <p className="text-lg text-gray-600">Track your Sales, Profit Margins, and Stock Ageing Reports in one place.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          className="border rounded px-3 py-2 text-sm text-gray-700"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-3 py-2 text-sm text-gray-700"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<IoBagCheck />} title="Total Sales" value={kpis.totalSales} iconColor="#2E7D32" />
        <KpiCard icon={<FaChartLine />} title="Total Profit" value={kpis.totalProfit} iconColor="#C1272D" />
        <KpiCard icon={<FaBoxes />} title="Total Quantity" value={kpis.totalQuantity} iconColor="#607D8B" />
        <KpiCard icon={<FaWarehouse />} title="Top Customer" value={kpis.topCustomer} iconColor="#1B2E59" />
      </div>

      {/* Stock Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Stock Freshness">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stockFreshness}
                cx="50%"
                cy="50%"
                outerRadius={90}
                labelLine={false}
                dataKey="value"
                label={({ percent }) => `${(((percent || 0) * 100).toFixed(1))}%`}
              >
                {stockFreshness.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${toNum(value).toLocaleString("en-IN")}`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock Value by Age">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stockSplit}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${toNum(value).toLocaleString("en-IN")}`} />
              <Bar dataKey="value" fill="#C1272D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Customers & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Top Categories Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-md font-semibold mb-4 text-[#1B2E59]">Top Categories by Sales (₹)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" data={topCategories}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `₹${toNum(v).toLocaleString("en-IN")}`} />
              <YAxis dataKey="name" type="category" width={180} />
              <Tooltip formatter={(value) => `₹${toNum(value).toLocaleString("en-IN")}`} />
              <Bar dataKey="value" fill="#03A9F4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers Table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-md font-semibold mb-4 text-[#1B2E59]">Top Customers by Gross Sales</h3>
          <table className="min-w-full text-sm text-left border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-[#F4F6FA] text-gray-700 font-medium">
              <tr>
                <th className="px-4 py-3 border-b border-gray-200">Customer</th>
                <th className="px-4 py-3 border-b border-gray-200 text-right">Total Gross Sales (₹)</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {topCustomers.length > 0 ? (
                topCustomers.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b border-gray-200">{row.customer}</td>
                    <td className="px-4 py-2 border-b border-gray-200 text-right font-medium">
                      ₹{toNum(row.amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-gray-500">
                    No data available for selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Reports Menu (Tabs) ----- */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#1B2E59]">Reports</h2>
          <div className="flex gap-2">
            {REPORT_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveReport(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm border transition ${
                  activeReport === t.key
                    ? "bg-[#C1272D] text-white border-[#C1272D]"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          {reportLoading ? (
            <p className="text-gray-500">Loading {REPORT_TABS.find(r => r.key === activeReport)?.label}…</p>
          ) : reportErr ? (
            <p className="text-red-500">Error: {reportErr}</p>
          ) : reportRows.length === 0 ? (
            <p className="text-gray-500">No data found for selected month/year.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead>
                  <tr>
                    {getColumns(activeReport, reportRows[0]).map((col) => (
                      <th key={col.key} className="border px-3 py-2 bg-gray-50 text-left">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      {getColumns(activeReport, reportRows[0]).map((col) => (
                        <td key={col.key} className="border px-3 py-2 whitespace-nowrap">
                          {formatCell(row[col.key], col.type, nfmt)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* ----- /Reports Menu ----- */}
    </div>
  );
}

function KpiCard({ icon, title, value, subtitle = "", iconColor = "#1B2E59", bgColor = "#E3F2FD" }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4 h-28">
      <div className="p-3 rounded-full" style={{ backgroundColor: bgColor }}>
        <div className="text-xl" style={{ color: iconColor }}>{icon}</div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <p className="text-xl font-bold text-[#1B2E59] leading-tight">{value}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

/* ---------- Helpers for Reports Table ---------- */
function formatCell(value, type, nfmt) {
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
