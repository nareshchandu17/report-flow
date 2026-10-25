import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { EdgeAura } from "edge-aura/react";

import { Navbar } from "@/components/navbar";

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
        <EdgeAura
          options={{
            geometry: { band: 40, cornerFill: true },
            palette: { pastel: 0.22, ringAlpha: 0.53, normalize: false, background: "dark", blendMode: "plus-lighter" },
            motion: { hueDriftDeg: 0 },
            input: { tapEnergy: 1.1, keyEnergy: 1.2 },
          }}
        />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 container mx-auto p-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
