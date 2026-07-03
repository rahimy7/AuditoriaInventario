import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download, Plus, Search } from "lucide-react";
import { useStore } from "@/data/store";
import { AUDIT_STATUS_LABELS, type AuditStatus } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { AuditCard } from "@/components/common/AuditCard";
import { CreateAuditDialog } from "@/components/audits/CreateAuditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, downloadCSV } from "@/lib/format";

const STATUS_FILTERS: (AuditStatus | "todos")[] = [
  "todos",
  "creado",
  "asignado",
  "en_proceso",
  "enviado",
  "en_revision",
  "devuelto",
  "aprobado",
  "cerrado",
];

export function AuditsPage() {
  const { user, audits, getUserAudits, getSupervisorAudits, getUserById } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AuditStatus | "todos">("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const scope = !user
    ? []
    : user.role === "auxiliar"
      ? getUserAudits(user.id)
      : user.role === "supervisor"
        ? getSupervisorAudits(user.id)
        : audits;

  const filtered = useMemo(
    () =>
      scope
        .filter((a) => status === "todos" || a.status === status)
        .filter(
          (a) =>
            !query.trim() ||
            a.name.toLowerCase().includes(query.toLowerCase()) ||
            a.warehouse.toLowerCase().includes(query.toLowerCase()) ||
            a.location.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [scope, status, query],
  );

  if (!user) return null;

  const exportCsv = () =>
    downloadCSV(
      "auditorias.csv",
      filtered.map((a) => ({
        nombre: a.name,
        almacen: a.warehouse,
        ubicacion: a.location,
        estado: AUDIT_STATUS_LABELS[a.status],
        avance: `${a.progress}%`,
        auxiliares: a.assignedTo.length,
        supervisor: getUserById(a.supervisorId)?.name ?? "",
        creada: formatDate(a.createdAt),
        actualizada: formatDate(a.updatedAt),
      })),
    );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Auditorías"
        description={
          user.role === "auxiliar" ? "Tu pool de trabajo asignado." : "Gestiona el ciclo completo de las auditorías."
        }
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            {user.role === "gerente" && (
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nueva auditoría
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, almacén o zona…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as AuditStatus | "todos")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "todos" ? "Todos los estados" : AUDIT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card view (mobile) */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((a) => (
          <AuditCard key={a.id} audit={a} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No se encontraron auditorías.
          </div>
        )}
      </div>

      {/* Table view (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auditoría</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-48">Avance</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Actualizada</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.location || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{a.warehouse}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={a.progress} />
                      <span className="w-9 text-right text-xs font-semibold text-primary">{a.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.assignedTo.length} aux · {getUserById(a.supervisorId)?.name.split(" ")[0] ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(a.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/audits/${a.id}`}>
                      <Button size="sm" variant="ghost">
                        Abrir
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No se encontraron auditorías.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateAuditDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
