import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CheckSquare,
  ClipboardCheck,
  EyeOff,
  FileDown,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/data/store";
import {
  AUDIT_STATUS_LABELS,
  AUDIT_TRANSITIONS,
  COUNT_STATUS_LABELS,
  type CountStatus,
} from "@/data/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AddProductsDialog } from "@/components/audits/AddProductsDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportAuditPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { formatDate, relativeTime } from "@/lib/format";

export function AuditDetailPage({ id }: { id: string }) {
  const store = useStore();
  const { user, getAudit, getAuditItems, getUserById, users } = store;
  const [, navigate] = useLocation();

  const audit = getAudit(id);
  const items = getAuditItems(id);

  const [assignDraft, setAssignDraft] = useState<string[]>(audit?.assignedTo ?? []);
  const [itemQuery, setItemQuery] = useState("");
  const [itemStatus, setItemStatus] = useState<CountStatus | "todos">("todos");
  const [itemAuxFilter, setItemAuxFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Auxiliares filtered to the audit's warehouse (fallback to all if none match)
  const auxiliaresInWarehouse = users.filter((u) => u.role === "auxiliar" && u.active && u.warehouse === audit?.warehouse);
  const auxiliares = auxiliaresInWarehouse.length > 0 ? auxiliaresInWarehouse : users.filter((u) => u.role === "auxiliar" && u.active);

  const filteredItems = useMemo(
    () =>
      items
        .filter((i) => itemStatus === "todos" || i.status === itemStatus)
        .filter((i) => itemAuxFilter === "todos" || i.assignedTo === itemAuxFilter)
        .filter(
          (i) =>
            !itemQuery.trim() ||
            i.product.name.toLowerCase().includes(itemQuery.toLowerCase()) ||
            i.product.code.toLowerCase().includes(itemQuery.toLowerCase()),
        ),
    [items, itemQuery, itemStatus, itemAuxFilter],
  );

  if (!user) return null;
  if (!audit) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Auditoría no encontrada.{" "}
        <Link href="/audits" className="text-primary hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const role = user.role;
  const canManage = role === "gerente" || role === "supervisor";
  const blindForRole =
    (role === "auxiliar" && (audit.blindForAuxiliar ?? false)) ||
    (role === "supervisor" && (audit.blindForSupervisor ?? false));

  const total = items.length;
  const counted = items.filter((i) => i.countedQty !== null).length;
  const sent = items.filter((i) => i.status === "enviado").length;
  const diffs = items.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;

  const transitions = AUDIT_TRANSITIONS[audit.status];
  const isAssignedAux = role === "auxiliar" && audit.assignedTo.includes(user.id);

  const reassignOptions = auxiliares.filter((u) => audit.assignedTo.includes(u.id));
  const reassignPool = reassignOptions.length > 0 ? reassignOptions : auxiliares;

  const applyReassign = () => {
    if (!reassignTo || selected.length === 0) return;
    store.reassignItems(selected, reassignTo);
    toast.success(`${selected.length} ítem(s) reasignados`);
    setSelected([]);
    setReassignTo("");
  };

  const toggleSel = (id2: string) =>
    setSelected((prev) => (prev.includes(id2) ? prev.filter((x) => x !== id2) : [...prev, id2]));
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((i) => selected.includes(i.id));

  const auditActivity = store.activity.filter(
    (a) => (a.entity === "audit" && a.entityId === audit.id) || (a.entity === "count" && items.some((i) => i.id === a.entityId)),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <Link href="/audits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Auditorías
      </Link>

      <PageHeader
        title={audit.name}
        description={`${audit.warehouse}${audit.location ? ` · ${audit.location}` : ""}`}
        actions={
          <>
            {isAssignedAux && ["asignado", "en_proceso", "devuelto"].includes(audit.status) && (
              <Link href={`/audits/${audit.id}/count`}>
                <Button className="gap-2">
                  <ClipboardCheck className="h-4 w-4" /> Registrar conteo
                </Button>
              </Link>
            )}
            {canManage && sent > 0 && (
              <Link href={`/audits/${audit.id}/review`}>
                <Button className="gap-2">
                  <CheckSquare className="h-4 w-4" /> Revisar ({sent})
                </Button>
              </Link>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> PDF
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportAuditPdf(audit, items, users, "progress")}>
                    Reporte de avance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAuditPdf(audit, items, users, "results")}>
                    Reporte de resultados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <StatusBadge status={audit.status} />
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Ítems", value: total },
          { label: "Contados", value: counted },
          { label: "Pendientes", value: total - counted },
          { label: "Por revisar", value: sent },
          { label: "Diferencias", value: blindForRole ? "—" : diffs },
        ].map((k) => (
          <Card key={k.label} className="p-3">
            <div className="text-xl font-bold text-foreground">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="items">Ítems ({total})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ---------------- Resumen ---------------- */}
        <TabsContent value="resumen" className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span>Avance global</span>
              <span className="text-primary">{audit.progress}%</span>
            </div>
            <ProgressBar value={audit.progress} />
          </Card>

          <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Avance por auxiliar</h3>
              {audit.assignedTo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin auxiliares asignados.</p>
              ) : (
                <div className="space-y-3">
                  {audit.assignedTo.map((auxId) => {
                    const aux = getUserById(auxId);
                    const auxItems = items.filter((i) => i.assignedTo === auxId);
                    const auxTotal = auxItems.length;
                    const auxCounted = auxItems.filter((i) => i.countedQty !== null).length;
                    const auxSent = auxItems.filter((i) => i.status === "enviado" || i.status === "aprobado").length;
                    const auxPct = auxTotal > 0 ? Math.round((auxCounted / auxTotal) * 100) : 0;
                    return (
                      <div key={auxId} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">{aux?.name ?? auxId}</span>
                          <span className="text-xs text-muted-foreground">
                            {auxCounted}/{auxTotal} contados · {auxSent} enviados
                          </span>
                        </div>
                        <ProgressBar value={auxPct} />
                        <div className="mt-1 text-right text-xs text-muted-foreground">{auxPct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Detalle</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Supervisor" value={getUserById(audit.supervisorId)?.name ?? "—"} />
                <Row label="Creada por" value={getUserById(audit.createdBy)?.name ?? "—"} />
                <Row label="Creada" value={formatDate(audit.createdAt)} />
                <Row label="Actualizada" value={formatDate(audit.updatedAt)} />
                <Row label="Líneas" value={audit.lines.join(", ") || "—"} />
                <Row label="Categorías" value={audit.categories.join(", ") || "—"} />
                <Row
                  label="Conteo a ciegas"
                  value={
                    [audit.blindForAuxiliar ? "Auxiliar" : null, audit.blindForSupervisor ? "Supervisor" : null]
                      .filter(Boolean)
                      .join(" · ") || "No"
                  }
                />
              </dl>
            </Card>

            {canManage && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="mb-2 text-sm font-bold">Flujo de trabajo</h3>
                  <div className="flex flex-wrap gap-2">
                    {transitions.length === 0 && <span className="text-sm text-muted-foreground">Sin acciones disponibles.</span>}
                    {transitions.map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          store.updateAuditStatus(audit.id, t);
                          toast.success(`Estado: ${AUDIT_STATUS_LABELS[t]}`);
                        }}
                      >
                        → {AUDIT_STATUS_LABELS[t]}
                      </Button>
                    ))}
                    {audit.status !== "cerrado" && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmClose(true)}>
                        Cerrar auditoría
                      </Button>
                    )}
                    {role === "gerente" && (
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-bold">Auxiliares asignados</h3>
                  {audit.warehouse && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Mostrando auxiliares del almacén <span className="font-medium">{audit.warehouse}</span>
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {auxiliares.map((a) => (
                      <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted/50">
                        <Checkbox
                          checked={assignDraft.includes(a.id)}
                          onCheckedChange={() =>
                            setAssignDraft((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                          }
                        />
                        <span className="min-w-0 truncate">{a.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      store.assignUsers(audit.id, assignDraft);
                      toast.success("Asignación actualizada");
                    }}
                  >
                    Guardar asignación
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ---------------- Ítems ---------------- */}
        <TabsContent value="items" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              placeholder="Buscar producto…"
              className="sm:max-w-xs"
            />
            <Select value={itemStatus} onValueChange={(v) => setItemStatus(v as CountStatus | "todos")}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {(["pendiente", "contado", "enviado", "aprobado", "devuelto"] as CountStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {COUNT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {audit.assignedTo.length > 1 && (
              <Select value={itemAuxFilter} onValueChange={setItemAuxFilter}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los auxiliares</SelectItem>
                  {audit.assignedTo.map((auxId) => {
                    const aux = getUserById(auxId);
                    return (
                      <SelectItem key={auxId} value={auxId}>
                        {aux?.name ?? auxId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {canManage && (
              <Button variant="outline" className="gap-2 sm:ml-auto" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Agregar productos
              </Button>
            )}
          </div>

          {canManage && selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-secondary/60 p-2">
              <span className="text-sm font-medium">{selected.length} seleccionados</span>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger className="h-8 w-48">
                  <SelectValue placeholder="Reasignar a…" />
                </SelectTrigger>
                <SelectContent>
                  {reassignPool.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={applyReassign} disabled={!reassignTo}>
                Reasignar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Limpiar
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={() =>
                            setSelected(allVisibleSelected ? [] : filteredItems.map((i) => i.id))
                          }
                        />
                      </TableHead>
                    )}
                    <TableHead>Producto</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Asignado</TableHead>
                    {!blindForRole && <TableHead className="text-right">Sistema</TableHead>}
                    <TableHead className="text-right">Contado</TableHead>
                    {!blindForRole && <TableHead className="text-right">Dif.</TableHead>}
                    <TableHead>Estado</TableHead>
                    {canManage && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((i) => {
                    const diff = i.countedQty !== null ? i.countedQty - i.systemQty : null;
                    return (
                      <TableRow key={i.id}>
                        {canManage && (
                          <TableCell>
                            <Checkbox checked={selected.includes(i.id)} onCheckedChange={() => toggleSel(i.id)} />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium text-foreground">{i.product.name}</div>
                          <div className="text-xs text-muted-foreground">{i.product.code}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{i.location}</TableCell>
                        <TableCell className="text-sm">{getUserById(i.assignedTo)?.name.split(" ")[0] ?? "—"}</TableCell>
                        {!blindForRole && <TableCell className="text-right text-sm">{i.systemQty}</TableCell>}
                        <TableCell className="text-right text-sm font-semibold">{i.countedQty ?? "—"}</TableCell>
                        {!blindForRole && (
                          <TableCell className="text-right">
                            {diff === null || diff === 0 ? (
                              <span className="text-xs text-muted-foreground">{diff === 0 ? "0" : "—"}</span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 text-xs font-semibold"
                                style={{ color: diff > 0 ? "#E65100" : "#C62828" }}
                              >
                                {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {diff > 0 ? "+" : ""}
                                {diff}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={i.status} type="count" />
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => store.removeCountItem(i.id)}
                              title="Quitar ítem"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        {blindForRole ? (
                          <span className="inline-flex items-center gap-2">
                            <EyeOff className="h-4 w-4" /> Sin ítems para mostrar
                          </span>
                        ) : (
                          "Sin ítems. Agrega productos para comenzar."
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ---------------- Historial ---------------- */}
        <TabsContent value="historial">
          <Card className="divide-y p-0">
            {auditActivity.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sin actividad registrada.</div>}
            {auditActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{a.userName}</span> {a.action}
                    {a.detail ? <span className="text-muted-foreground"> — {a.detail}</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{relativeTime(a.timestamp)}</div>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <AddProductsDialog audit={audit} open={addOpen} onOpenChange={setAddOpen} />
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Cerrar auditoría"
        description="La auditoría quedará marcada como cerrada. Podrás consultarla pero no continuar el conteo."
        confirmLabel="Cerrar"
        onConfirm={() => {
          store.closeAudit(audit.id);
          toast.success("Auditoría cerrada");
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar auditoría"
        description="Se eliminará la auditoría y todos sus ítems de conteo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          store.deleteAudit(audit.id);
          toast.success("Auditoría eliminada");
          navigate("/audits");
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
