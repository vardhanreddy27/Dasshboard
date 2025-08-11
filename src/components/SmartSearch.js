// File: components/SmartSearch.js
"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import GptResultCard from "./GptResultCard";

export default function SmartSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query) {
      setResult(null); // ✅ Clear result when query is empty
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/chatgpt-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({
          result: data.result ?? data.query ?? data.answer ?? null,
          raw: data,
          query,
        });
      } else {
        setError(data.message || "Unknown error");
      }
    } catch (err) {
      setError("Failed to fetch GPT result");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResult(null); // ✅ Hide card if search is cleared
    }
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="px-20 w-full">
        <div className="flex items-center border border-gray-300 rounded-md px-4 py-2 shadow-sm bg-white">
          <Search className="h-5 w-5 text-gray-500 mr-2" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange} // ✅ updated
            placeholder="Ask ASF: e.g. 'Top customer this month'"
            className="w-full outline-none text-sm text-gray-700 bg-transparent"
          />
        </div>
      </form>

      {loading && <p className="text-center text-gray-500">Thinking…</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      {result && <GptResultCard data={result} />} {/* ✅ Won't render if result is null */}
    </div>
  );
}
