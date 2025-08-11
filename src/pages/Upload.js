"use client";
import React, { useState } from "react";
import Select from "react-select";
import Swal from "sweetalert2";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFileAlt } from "react-icons/fa";

const months = [
  { value: 0, label: "January" }, { value: 1, label: "February" },
  { value: 2, label: "March" },   { value: 3, label: "April" },
  { value: 4, label: "May" },     { value: 5, label: "June" },
  { value: 6, label: "July" },    { value: 7, label: "August" },
  { value: 8, label: "September" },{ value: 9, label: "October" },
  { value: 10, label: "November" },{ value: 11, label: "December" },
];

const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "csv"];

export default function Upload() {
  // --- Default to previous month/year ---
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [selectedMonth, setSelectedMonth] = useState(months[prev.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(prev.getFullYear());
  // --------------------------------------

  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return allowedExtensions.includes(ext);
    });
    if (validFiles.length < selectedFiles.length) {
      Swal.fire("Rejected", "Only PDF, Word, CSV, and Excel files are allowed.", "warning");
    }
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return <FaFilePdf className="text-red-500 text-lg mr-2" />;
    if (["doc", "docx"].includes(ext)) return <FaFileWord className="text-blue-500 text-lg mr-2" />;
    if (["xls", "xlsx", "csv"].includes(ext)) return <FaFileExcel className="text-green-500 text-lg mr-2" />;
    return <FaFileAlt className="text-gray-500 text-lg mr-2" />;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      Swal.fire({
        title: "Uploading & parsing…",
        html: "Please wait while we process your files.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const fd = new FormData();
      // Send previous month (+1 for 1–12) and its corresponding year
      fd.append("month", String(selectedMonth.value + 1));
      fd.append("year", String(selectedYear));
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/upload", { method: "POST", body: fd });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();

      Swal.fire({
        icon: "success",
        title: "Upload Successful",
        text: `Inserted ${data.rowsInserted} rows into the database.`,
      });

      setFiles([]);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Upload failed", text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8f9fb] via-white to-[#f2f4f8] p-4">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-2xl p-6 relative pb-20 sm:pb-6 border border-[#1B2E59]/10">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/agasthyalogo.png" alt="Agasthya Superfoods" className="h-16 object-contain" />
        </div>

        {/* Header */}
        <h2 className="text-xl font-bold text-center text-[#1B2E59] mb-5">
          Upload Monthly Report
        </h2>

        {/* Month + Year */}
        <div className="flex gap-3 mb-5">
          <Select
            value={selectedMonth}
            onChange={(opt) => setSelectedMonth(opt)}
            options={months}
            className="flex-1"
          />
          <input
            type="text"
            value={selectedYear}
            readOnly
            className="flex-1 text-center bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-[#1B2E59] font-semibold"
          />
        </div>

        {/* Drop Zone */}
        <label
          htmlFor="fileUpload"
          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#1B2E59]/40 rounded-xl cursor-pointer hover:border-[#C1272D] transition"
        >
          <AiOutlineCloudUpload className="text-5xl text-[#C1272D] mb-2" />
          <p className="text-gray-600 font-medium">
            Drag & drop files or <span className="text-[#1B2E59] underline">Browse</span>
          </p>
          <input
            id="fileUpload"
            type="file"
            multiple
            accept=".pdf, .doc, .docx, .xls, .xlsx, .csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto mb-20 sm:mb-0">
            <h3 className="text-sm font-semibold text-[#1B2E59] mb-2">Files to Upload:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-[#f8f9fb] rounded-md px-3 py-2 border border-[#1B2E59]/20"
                >
                  <div className="flex items-center w-3/4 truncate">
                    {getFileIcon(file.name)}
                    <span className="truncate text-sm text-gray-700">{file.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-[#C1272D] text-xs hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <br />

        {/* Upload button */}
        <div className="fixed bottom-0 left-0 w-full sm:static sm:w-auto p-4 sm:p-0 bg-white sm:bg-none shadow-inner sm:shadow-none">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              files.length === 0 || isUploading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#C1272D]"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
