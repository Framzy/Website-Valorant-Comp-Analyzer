"use client";

import { useEffect, useState } from "react";

export function SiteFooter() {
  const [latestYear, setLatestYear] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/options/years")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { years?: number[] } | null) => {
        if (!cancelled && data && Array.isArray(data.years) && data.years.length > 0) {
          setLatestYear(data.years[data.years.length - 1]);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="flex flex-col items-center gap-1 border-t border-line pt-4 text-center">
      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-subtle">
        Last Data Updated: {latestYear ?? "—"}
      </p>
      <p className="text-[0.7rem] text-subtle">© Framzy. All rights reserved.</p>
    </footer>
  );
}
