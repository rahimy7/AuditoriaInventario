import { useMemo, useState } from "react";
import { Boxes, ChevronRight, MapPin, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { useStore } from "@/data/store";
import type { Locality, StorageLocation, Warehouse } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type Kind = "locality" | "warehouse" | "storage";
interface Draft {
  name: string;
  code: string;
  active: boolean;
}
const EMPTY: Draft = { name: "", code: "", active: true };

const KIND_LABEL: Record<Kind, string> = { locality: "Localidad", warehouse: "Almacén", storage: "Ubicación" };

export function LocationsPage() {
  const store = useStore();
  const { localities, warehouses, storageLocations } = store;

  const [localityId, setLocalityId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: Kind; id: string | null; draft: Draft } | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: Kind; id: string; name: string } | null>(null);

  const whList = useMemo(() => warehouses.filter((w) => w.localityId === localityId), [warehouses, localityId]);
  const slList = useMemo(
    () => storageLocations.filter((s) => s.warehouseId === warehouseId),
    [storageLocations, warehouseId],
  );

  const openNew = (kind: Kind) => setEditing({ kind, id: null, draft: { ...EMPTY } });
  const openEdit = (kind: Kind, item: Locality | Warehouse | StorageLocation) =>
    setEditing({ kind, id: item.id, draft: { name: item.name, code: item.code, active: item.active } });

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const { kind, id } = editing;
    try {
      if (kind === "locality") {
        if (id) await store.updateLocality(id, d);
        else await store.createLocality(d);
      } else if (kind === "warehouse") {
        if (id) await store.updateWarehouse(id, d);
        else await store.createWarehouse({ ...d, localityId: localityId! });
      } else {
        if (id) await store.updateStorageLocation(id, d);
        else await store.createStorageLocation({ ...d, warehouseId: warehouseId! });
      }
      toast.success(`${KIND_LABEL[kind]} ${id ? "actualizada" : "creada"}`);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { kind, id } = toDelete;
    try {
      if (kind === "locality") {
        await store.deleteLocality(id);
        if (localityId === id) {
          setLocalityId(null);
          setWarehouseId(null);
        }
      } else if (kind === "warehouse") {
        await store.deleteWarehouse(id);
        if (warehouseId === id) setWarehouseId(null);
      } else {
        await store.deleteStorageLocation(id);
      }
      toast.success(`${KIND_LABEL[kind]} eliminada`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const update = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Ubicaciones"
        description={`${localities.length} localidades · ${warehouses.length} almacenes · ${storageLocations.length} ubicaciones`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Column
          icon={<MapPin className="h-4 w-4" />}
          title="Localidades"
          onAdd={() => openNew("locality")}
          empty="Sin localidades"
        >
          {localities.map((l) => (
            <Row
              key={l.id}
              name={l.name}
              code={l.code}
              active={l.active}
              selected={l.id === localityId}
              onSelect={() => {
                setLocalityId(l.id);
                setWarehouseId(null);
              }}
              onEdit={() => openEdit("locality", l)}
              onDelete={() => setToDelete({ kind: "locality", id: l.id, name: l.name })}
              chevron
            />
          ))}
        </Column>

        <Column
          icon={<WarehouseIcon className="h-4 w-4" />}
          title="Almacenes"
          onAdd={localityId ? () => openNew("warehouse") : undefined}
          empty={localityId ? "Sin almacenes en esta localidad" : "Selecciona una localidad"}
        >
          {localityId &&
            whList.map((w) => (
              <Row
                key={w.id}
                name={w.name}
                code={w.code}
                active={w.active}
                selected={w.id === warehouseId}
                onSelect={() => setWarehouseId(w.id)}
                onEdit={() => openEdit("warehouse", w)}
                onDelete={() => setToDelete({ kind: "warehouse", id: w.id, name: w.name })}
                chevron
              />
            ))}
        </Column>

        <Column
          icon={<Boxes className="h-4 w-4" />}
          title="Ubicaciones"
          onAdd={warehouseId ? () => openNew("storage") : undefined}
          empty={warehouseId ? "Sin ubicaciones en este almacén" : "Selecciona un almacén"}
        >
          {warehouseId &&
            slList.map((s) => (
              <Row
                key={s.id}
                name={s.name}
                code={s.code}
                active={s.active}
                onEdit={() => openEdit("storage", s)}
                onDelete={() => setToDelete({ kind: "storage", id: s.id, name: s.name })}
              />
            ))}
        </Column>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Editar" : "Nueva"} {editing ? KIND_LABEL[editing.kind].toLowerCase() : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={editing.draft.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={editing.draft.code} onChange={(e) => update({ code: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label>Activo</Label>
                <Switch checked={editing.draft.active} onCheckedChange={(v) => update({ active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Eliminar ${toDelete ? KIND_LABEL[toDelete.kind].toLowerCase() : ""}`}
        description={
          toDelete
            ? `Se eliminará "${toDelete.name}"${toDelete.kind !== "storage" ? " y todo su contenido" : ""}.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Column({
  icon,
  title,
  onAdd,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onAdd?: () => void;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.some(Boolean) : !!children;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!onAdd} onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[60vh] min-h-[8rem] overflow-y-auto p-1.5">
        {hasChildren ? (
          <div className="space-y-1">{children}</div>
        ) : (
          <div className="flex h-24 items-center justify-center px-3 text-center text-xs text-muted-foreground">{empty}</div>
        )}
      </div>
    </div>
  );
}

function Row({
  name,
  code,
  active,
  selected,
  chevron,
  onSelect,
  onEdit,
  onDelete,
}: {
  name: string;
  code: string;
  active: boolean;
  selected?: boolean;
  chevron?: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
        onSelect && "cursor-pointer",
        selected ? "bg-accent" : "hover:bg-muted/60",
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate font-medium", !active && "text-muted-foreground line-through")}>{name}</span>
          {code ? <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{code}</span> : null}
        </div>
      </div>
      <button
        className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {chevron ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );
}
