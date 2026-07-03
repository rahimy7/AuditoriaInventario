import {
  AUDIT_STATUS_LABELS,
  COUNT_STATUS_LABELS,
  STATUS_COLORS,
  type AuditStatus,
  type CountStatus,
} from "@/data/types";

interface Props {
  status: AuditStatus | CountStatus;
  type?: "audit" | "count";
  className?: string;
}

export function StatusBadge({ status, type = "audit", className }: Props) {
  const label =
    type === "audit"
      ? (AUDIT_STATUS_LABELS as Record<string, string>)[status] ?? status
      : (COUNT_STATUS_LABELS as Record<string, string>)[status] ?? status;
  const c = STATUS_COLORS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className ?? ""}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.text }} />
      {label}
    </span>
  );
}
