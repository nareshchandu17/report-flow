import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { FileText, LayoutDashboard, History } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReportFlow SaaS",
  description: "Production grade background report generation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center px-4">
              <div className="mr-8 flex items-center gap-2 text-white font-bold text-xl tracking-tight">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                ReportFlow
              </div>
              <nav className="flex items-center space-x-6 text-sm font-medium">
                <Link href="/" className="transition-colors hover:text-white/80 text-white flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/reports" className="transition-colors hover:text-white/80 text-white/60 flex items-center gap-2">
                  <History className="h-4 w-4" /> Reports History
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto p-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
