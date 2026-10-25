"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LayoutDashboard, History, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isLoginPage = pathname === "/login";

  const handleConfirmLogout = () => {
    api.logout();
    setShowLogoutModal(false);
    router.push("/login");
  };

  return (
    <>
      <header className="z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-white font-bold text-xl tracking-tight transition-opacity hover:opacity-90"
            >
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span>ReportFlow</span>
            </Link>

            {!isLoginPage && (
              <nav className="flex items-center gap-1.5 text-sm font-medium">
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    pathname === "/"
                      ? "text-white bg-white/10 font-semibold shadow-sm border border-white/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/reports"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    pathname.startsWith("/reports")
                      ? "text-white bg-white/10 font-semibold shadow-sm border border-white/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Reports History</span>
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Logout Action */}
          {!isLoginPage && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-zinc-300 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                title="Sign out of your account"
              >
                <LogOut className="h-3.5 w-3.5 text-zinc-400 group-hover:text-rose-400 transition-all duration-200 group-hover:translate-x-0.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Glassmorphic Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950/90 backdrop-blur-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon & Message */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-base font-semibold text-white">Confirm Sign Out</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to log out of ReportFlow? You will need to sign back in to access your analytics dashboard and generated reports.
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutModal(false)}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs px-4 h-8 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmLogout}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 h-8 rounded-xl shadow-lg shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer font-medium"
              >
                Yes, Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
