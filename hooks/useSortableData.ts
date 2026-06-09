import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export function useSortableData<T extends object>(
  data: T[],
  initialConfig?: SortConfig<T>
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    initialConfig ?? null
  );

  const items = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        const aTrim = aVal.trim();
        const bTrim = bVal.trim();
        const aNum = Number(aTrim);
        const bNum = Number(bTrim);
        if (aTrim !== "" && bTrim !== "" && !isNaN(aNum) && !isNaN(bNum)) {
          // numeric strings (e.g. decimal amounts stored as string)
          cmp = aNum - bNum;
        } else {
          const aMs = Date.parse(aVal);
          const bMs = Date.parse(bVal);
          if (!isNaN(aMs) && !isNaN(bMs)) {
            cmp = aMs - bMs;
          } else {
            cmp = aVal.localeCompare(bVal, "sr-Latn", { sensitivity: "base" });
          }
        }
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "sr-Latn", { sensitivity: "base" });
      }

      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return { items, requestSort, sortConfig };
}
