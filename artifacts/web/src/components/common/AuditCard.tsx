import { Link } from "wouter";
import { MapPin, Users2, Warehouse } from "lucide-react";
import type { Audit } from "@/data/types";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { formatDate } from "@/lib/format";

export function AuditCard({ audit }: { audit: Audit }) {
  return (
    <Link
      href={`/audits/${audit.id}`}
      className="block rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{audit.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Warehouse className="h-3.5 w-3.5" />
              {audit.warehouse}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {audit.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users2 className="h-3.5 w-3.5" />
              {audit.assignedTo.length}
            </span>
          </div>
        </div>
        <StatusBadge status={audit.status} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={audit.progress} />
        <span className="w-10 text-right text-sm font-bold text-primary">{audit.progress}%</span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">Actualizado {formatDate(audit.updatedAt)}</div>
    </Link>
  );
}
