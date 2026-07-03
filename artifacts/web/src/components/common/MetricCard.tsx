import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  hint?: string;
}

export function MetricCard({ label, value, icon: Icon, color = "#1565C0", hint }: Props) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-foreground">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        {hint ? <div className="truncate text-[11px] text-muted-foreground/70">{hint}</div> : null}
      </div>
    </Card>
  );
}
