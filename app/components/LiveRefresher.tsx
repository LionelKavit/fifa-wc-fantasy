"use client";

// Polls for fresh data only while matches are live. Uses router.refresh() so the
// server-rendered dashboard updates in place — preserving scroll position and the
// Scout chat's client state — and stops polling when nothing is live.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveRefresher({ live, intervalMs = 15000 }: { live: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs, router]);

  return null;
}
