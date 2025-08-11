// File: components/GptResultCard.js
"use client";

import React from "react";

export default function GptResultCard({ data }) {
  const { result, query } = data || {};

  const renderValue = (val) => {
    if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
    if (val === null || val === undefined || val === "") return "-";
    return String(val);
  };

  if (result == null) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <p className="text-gray-500">No data available for your query.</p>
      </div>
    );
  }

  // ✅ If result is a string (SQL or text), render it clearly
  if (typeof result === "string") {
    const looksLikeSQL = /\bselect\b|\bwith\b|\binsert\b|\bupdate\b|\bdelete\b/i.test(result);
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-md font-semibold mb-2 text-[#1B2E59]">GPT Result</h3>
        {query && (
          <p className="text-sm text-gray-500 mb-3">
            Query: <span className="font-medium">{query}</span>
          </p>
        )}
        <pre className={`text-sm whitespace-pre-wrap rounded-md p-3 border ${looksLikeSQL ? "bg-gray-50" : "bg-white"}`}>
{result}
        </pre>
      </div>
    );
  }

  // Single object result (KPI-style)
  if (!Array.isArray(result) && typeof result === "object") {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-md font-semibold mb-4 text-[#1B2E59]">GPT Result</h3>
        {query && (
          <p className="text-sm text-gray-500 mb-2">
            Query: <span className="font-medium">{query}</span>
          </p>
        )}
        <table className="min-w-full text-sm text-left">
          <tbody>
            {Object.entries(result).map(([key, val], idx) => (
              <tr key={idx} className="border-t">
                <td className="px-2 py-2 font-medium text-gray-700">{key}</td>
                <td className="px-2 py-2">{renderValue(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Array of objects (Table-style result)
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object") {
    const columns = Object.keys(result[0]);
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-md font-semibold mb-4 text-[#1B2E59]">GPT Result</h3>
        {query && (
          <p className="text-sm text-gray-500 mb-2">
            Query: <span className="font-medium">{query}</span>
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border border-gray-200">
            <thead className="bg-[#F4F6FA]">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-2 border-b border-gray-300 text-gray-700 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2 text-gray-800">
                      {renderValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <p className="text-gray-500">No data available for your query.</p>
    </div>
  );
}
