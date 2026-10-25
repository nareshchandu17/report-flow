"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api, ApiError, ReportJob } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  FileText,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Search,
  MoreHorizontal,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-white/10 rounded-lg" />
          <div className="h-24 bg-white/5 rounded-2xl border border-white/10" />
          <div className="h-96 bg-white/5 rounded-2xl border border-white/10" />
        </div>
      }
    >
      <ReportsHistory />
    </Suspense>
  );
}

function ReportsHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [reports, setReports] = useState<ReportJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pagination states: default 20 per page, dynamic page from route
  const pageParam = searchParams.get("page");
  const initialPage = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(20);

  // Action Menu & Deletion Dialog
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ReportJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      setOpenMenuId(null);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!localStorage.getItem("auth_token")) {
      router.push("/login");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.getReports({
        page,
        limit: pageSize,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
        sort: sortOrder,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      });

      setReports(res.data || []);
      setTotal(res.total ?? (res.data ? res.data.length : 0));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        api.logout();
        router.push("/login");
      } else {
        console.error("Failed to fetch reports:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, sortOrder, fromDate, toDate, router]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Sync page state when URL query changes (e.g. browser back/forward buttons)
  useEffect(() => {
    const pageInUrl = searchParams.get("page");
    const parsedPage = pageInUrl ? Math.max(1, parseInt(pageInUrl, 10) || 1) : 1;
    if (parsedPage !== page) {
      setPage(parsedPage);
    }
  }, [searchParams, page]);

  // Dynamic route update on page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      const validTotalPages = Math.max(1, Math.ceil(total / pageSize));
      if (newPage < 1 || (total > 0 && newPage > validTotalPages) || newPage === page) return;
      setPage(newPage);

      const params = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(newPage));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [page, total, pageSize, searchParams, pathname, router]
  );

  const resetPageToFirst = useCallback(() => {
    setPage(1);
    if (searchParams.has("page")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    resetPageToFirst();
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    resetPageToFirst();
  };

  const handleSortChange = (val: "newest" | "oldest") => {
    setSortOrder(val);
    resetPageToFirst();
  };

  const handleClearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setShowDatePicker(false);
    resetPageToFirst();
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteReport(reportToDelete.id);
      setReportToDelete(null);
      // Refresh list
      await fetchReports();
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      setDeleteError(err.message || "Failed to delete report");
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            COMPLETED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
            PROCESSING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            FAILED
          </span>
        );
      case "QUEUED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3 text-blue-400" />
            QUEUED
          </span>
        );
    }
  };

  // Date Formatter: "Oct 24, 2026 · 5:06 PM"
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${dateFormatted} · ${timeFormatted}`;
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page, "...", totalPages);
      }
    }

    return pages.map((p, idx) => {
      if (p === "...") {
        return (
          <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-xs text-zinc-500 select-none">
            …
          </span>
        );
      }
      const pageNum = Number(p);
      const isActive = pageNum === page;
      return (
        <button
          key={`page-${pageNum}`}
          type="button"
          onClick={() => handlePageChange(pageNum)}
          className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium select-none transition-all duration-200 ${
            isActive
              ? "bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.25)] scale-105 cursor-default"
              : "cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/15 border border-transparent hover:scale-105 active:scale-95"
          }`}
          aria-label={`Go to page ${pageNum}`}
          aria-current={isActive ? "page" : undefined}
        >
          {pageNum}
        </button>
      );
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Reports History</h1>
          <p className="text-sm text-muted-foreground">View and manage previously generated reports.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
          className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-xl shadow-xl space-y-3">
        {/* Row 1: Search & Status Dropdown */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all pr-8"
            >
              <option value="ALL" className="bg-zinc-900 text-white">All statuses</option>
              <option value="COMPLETED" className="bg-zinc-900 text-white">Completed</option>
              <option value="PROCESSING" className="bg-zinc-900 text-white">Processing</option>
              <option value="QUEUED" className="bg-zinc-900 text-white">Queued</option>
              <option value="FAILED" className="bg-zinc-900 text-white">Failed</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              ▾
            </div>
          </div>
        </div>

        {/* Row 2: Date Range Filter & Sort Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-white/5">
          {/* Date Range Popover Button */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(!showDatePicker);
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${fromDate || toDate
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]"
                }`}
            >
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "End"}`
                  : "Date range"}
              </span>
              <span className="text-zinc-500 text-[10px]">▾</span>
            </button>

            {/* Date Picker Popover */}
            {showDatePicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-white/10 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-white">Filter by Creation Date</span>
                  {(fromDate || toDate) && (
                    <button
                      onClick={handleClearDateFilter}
                      className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        resetPageToFirst();
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        resetPageToFirst();
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as "newest" | "oldest")}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer pr-7 transition-all"
              >
                <option value="newest" className="bg-zinc-900 text-white">Newest first</option>
                <option value="oldest" className="bg-zinc-900 text-white">Oldest first</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
                ▾
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List Card */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-white/5" role="status" aria-label="Loading reports">
              {Array.from({ length: 5 }, (_, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 px-6 animate-pulse">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-36 rounded-md bg-white/10" />
                      <div className="h-5 w-20 rounded-full bg-white/10" />
                    </div>
                    <div className="h-3 w-48 rounded bg-white/[0.06]" />
                  </div>
                  <div className="h-5 w-5 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-white font-medium text-base">No reports found</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                {search || statusFilter !== "ALL" || fromDate || toDate
                  ? "No reports match your active filter criteria. Try clearing some filters."
                  : "Generate your first report from the dashboard to see it here."}
              </p>
              {(search || statusFilter !== "ALL" || fromDate || toDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setFromDate("");
                    setToDate("");
                    resetPageToFirst();
                  }}
                  className="mt-4 border-white/10 text-xs"
                >
                  Reset all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="relative flex items-center justify-between p-4 px-5 hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  onClick={() => router.push(`/reports/${report.id}`)}
                >
                  {/* Left Column: Title, Badge, Dates */}
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-sm text-white tracking-wide">
                        {report.reportType.replace(/_/g, " ")}
                      </span>
                      {getStatusBadge(report.status)}
                      {report.status === "FAILED" && report.errorMessage && (
                        <span
                          className="text-xs text-rose-400/90 max-w-xs truncate"
                          title={report.errorMessage}
                        >
                          {report.errorMessage}
                        </span>
                      )}
                    </div>

                    {/* Clean Dates with proper ' · ' separator (eliminating any 'ò' artifact) */}
                    <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-1.5">
                      <span>{formatDateTime(report.createdAt)}</span>
                      {report.completedAt && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500">
                            Completed: {formatDateTime(report.completedAt)}
                          </span>
                        </>
                      )}
                      {report.dataset?.name && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500">{report.dataset.name}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Right Actions: '···' Menu + Chevron */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Action Menu (···) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === report.id ? null : report.id);
                        }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Actions"
                        aria-label="Actions menu"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === report.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/reports/${report.id}`);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                          >
                            <FileText className="h-3.5 w-3.5 text-zinc-400" />
                            View details
                          </button>

                          <div className="my-1 border-t border-white/5" />

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setReportToDelete(report);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            Delete report
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chevron Link */}
                    <button
                      type="button"
                      onClick={() => router.push(`/reports/${report.id}`)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-zinc-200 transition-colors"
                      aria-label="View report"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Numbered Pagination Toolbar */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 px-5 border-t border-white/5 bg-white/[0.01]">
              {/* Left: Summary text */}
              <div className="text-xs text-zinc-400">
                Showing{" "}
                <span className="font-semibold text-white">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
                </span>{" "}
                of <span className="font-semibold text-white">{total}</span> reports
              </div>

              {/* Right: Numbered Pagination Controls & Page Size */}
              <div className="flex items-center gap-1.5">
                {/* Previous Button (<) with cursor-pointer & micro-interactions */}
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className={`group relative h-8 w-8 rounded-lg flex items-center justify-center border border-white/10 transition-all duration-200 select-none ${
                    page <= 1
                      ? "opacity-30 cursor-not-allowed bg-white/[0.02] text-zinc-600"
                      : "cursor-pointer bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-110 active:scale-90 hover:shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  }`}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1">{renderPageNumbers()}</div>

                {/* Next Button (>) with cursor-pointer & micro-interactions */}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className={`group relative h-8 w-8 rounded-lg flex items-center justify-center border border-white/10 transition-all duration-200 select-none ${
                    page >= totalPages
                      ? "opacity-30 cursor-not-allowed bg-white/[0.02] text-zinc-600"
                      : "cursor-pointer bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-110 active:scale-90 hover:shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  }`}
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>

                {/* Page Size Selector */}
                <div className="relative ml-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      handlePageChange(1);
                    }}
                    className="appearance-none bg-white/[0.04] border border-white/10 rounded-lg pl-2 pr-6 py-1 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:bg-white/[0.08] transition-colors"
                  >
                    <option value={20} className="bg-zinc-900 text-white">20 / page</option>
                    <option value={50} className="bg-zinc-900 text-white">50 / page</option>
                    <option value={100} className="bg-zinc-900 text-white">100 / page</option>
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-[9px]">
                    ▾
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accidental Deletion Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Report?</h3>
                <p className="text-xs text-zinc-400">
                  {reportToDelete.reportType.replace(/_/g, " ")} · {formatDateTime(reportToDelete.createdAt)}
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              Are you sure you want to delete this report? This will permanently delete the report
              data and its generated PDF artifact from storage. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportToDelete(null)}
                disabled={isDeleting}
                className="border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
