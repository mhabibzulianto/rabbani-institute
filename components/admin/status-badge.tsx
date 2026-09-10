// src/components/admin/status-badge.tsx
// Requires: npx shadcn@latest add badge

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "published"
  | "draft"
  | "approved"
  | "not submitted"
  | "pending"
  | "changes requested"
  | "admin"
  | "instructor"
  | "student"
  | "enrolled"
  | "madrasah"
  | "mandiri";

const variantMap: Record<
  StatusVariant,
  { label: string; className: string }
> = {
  published: {
    label: "published",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  draft: {
    label: "draft",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  approved: {
    label: "approved",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  "not submitted": {
    label: "not submitted",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  pending: {
    label: "pending",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  },
  "changes requested": {
    label: "changes requested",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  },
  admin: {
    label: "admin",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  },
  instructor: {
    label: "instructor",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  student: {
    label: "student",
    className:
      "bg-secondary text-secondary-foreground border-border",
  },
  enrolled: {
    label: "enrolled",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  },
  madrasah: {
    label: "Madrasah",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  mandiri: {
    label: "Mandiri",
    className:
      "bg-secondary text-secondary-foreground border-border",
  },
};

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = variantMap[status] ?? {
    label: status,
    className: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium px-1.5 py-0 h-5 capitalize",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
