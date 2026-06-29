import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Bracket Analyst",
  description: "Fill your knockout bracket and get grounded strategy from the Analyst.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-200 antialiased">{children}</body>
    </html>
  );
}
