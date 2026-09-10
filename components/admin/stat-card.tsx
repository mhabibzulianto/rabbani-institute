// src/components/admin/stat-card.tsx
// Requires: npx shadcn@latest add card

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  value: number | string;
  label: string;
  note?: string;
  className?: string;
}

export function StatCard({ value, label, note, className }: StatCardProps) {
  return (
    <Card className={cn("hover:border-border/80 transition-colors", className)}>
      <CardContent className="pt-5 pb-4">
        <p className="text-3xl font-bold tabular-nums leading-none text-foreground">
          {value}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground font-medium">
          {label}
        </p>
        {note && (
          <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
