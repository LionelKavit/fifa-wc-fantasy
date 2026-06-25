import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Scout — World Cup 2026",
  description: "Live qualification scenarios and the Scout for the FIFA World Cup 2026.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-200 antialiased">{children}</body>
    </html>
  );
}
