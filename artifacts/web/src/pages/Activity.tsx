import { useMemo, useState } from "react";
import { ClipboardList, Download, Package, ScanLine, Search, User as UserIcon, type LucideIcon } from "lucide-react";
import { useStore } from "@/data/store";
import type { ActivityEntry } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, relativeTime, downloadCSV } from "@/lib/format";

const ENTITY_META: Record<ActivityEntry["entity"], { icon: LucideIcon; color: string; label: string }> = {
  audit: { icon: ClipboardList, color: "#1565C0", label: "Auditoría" },
  count: { icon: ScanLine, color: "#5E35B1", label: "Conteo" },
  user: { icon: UserIcon, color: "#C62828", label: "Usuario" },
  product: { icon: Package, color: "#2E7D32", label: "Producto" },
};

export function ActivityPage() {
  const { activity } = useStore();
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<ActivityEntry["entity"] | "todos">("todos");

  const filtered = useMemo(
    () =>
      activity
        .filter((a) => entity === "todos" || a.entity === entity)
        .filter(
          (a) =>
            !query.trim() ||
            a.userName.toLowerCase().includes(query.toLowerCase()) ||
            a.action.toLowerCase().includes(query.toLowerCase()) ||
            a.detail.toLowerCase().includes(query.toLowerCase()),
        ),
    [activity, query, entity],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Registro de actividad"
        description="Bitácora de acciones sobre auditorías, conteos, usuarios y productos."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCSV(
                "actividad.csv",
                filtered.map((a) => ({
                  fecha: formatDateTime(a.timestamp),
                  usuario: a.userName,
                  entidad: ENTITY_META[a.entity].label,
                  accion: a.action,
                  detalle: a.detail,
                })),
              )
            }
          >
            <Download className="h-4 w-4" /> Exportar
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en la bitácora…" className="pl-9" />
        </div>
        <Select value={entity} onValueChange={(v) => setEntity(v as ActivityEntry["entity"] | "todos")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo</SelectItem>
            <SelectItem value="audit">Auditorías</SelectItem>
            <SelectItem value="count">Conteos</SelectItem>
            <SelectItem value="user">Usuarios</SelectItem>
            <SelectItem value="product">Productos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y p-0">
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Sin actividad registrada.</div>}
        {filtered.map((a) => {
          const meta = ENTITY_META[a.entity];
          return (
            <div key={a.id} className="flex items-start gap-3 p-3">
              <span
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
              >
                <meta.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-semibold">{a.userName}</span> {a.action}
                  {a.detail ? <span className="text-muted-foreground"> — {a.detail}</span> : null}
                </div>
                <div className="text-xs text-muted-foreground" title={formatDateTime(a.timestamp)}>
                  {relativeTime(a.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
