"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function SearchForm({ defaultValue = "", compact = false }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextValue = useMemo(() => {
    const fullPath = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    return fullPath === "/search" ? "/" : fullPath;
  }, [pathname, searchParams]);

  return (
    <form action="/search" className={compact ? "search-form compact" : "search-form"}>
      <input name="q" type="search" placeholder="Cari kelas, artikel, FAQ, atau kebijakan" defaultValue={defaultValue} />
      <input type="hidden" name="next" value={nextValue} />
      <button className="button primary small" type="submit">
        Cari
      </button>
    </form>
  );
}
