import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/common/MultiSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

export function CreateAuditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { users, audits, warehouses, storageLocations, createAudit } = useStore();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [location, setLocation] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [blindAux, setBlindAux] = useState(false);
  const [blindSup, setBlindSup] = useState(false);

  // Warehouse names come from the location catalog, with a fallback to any names
  // already used by users/audits (backward compatibility with free-text data).
  const warehouseNames = useMemo(() => {
    const fromCatalog = warehouses.filter((w) => w.active).map((w) => w.name);
    const legacy = [...users.map((u) => u.warehouse).filter((w): w is string => !!w), ...audits.map((a) => a.warehouse)];
    return Array.from(new Set([...fromCatalog, ...legacy])).filter(Boolean);
  }, [warehouses, users, audits]);

  // Storage-location suggestions for the chosen warehouse (datalist; free text allowed).
  const locationOptions = useMemo(() => {
    const wh = warehouses.find((w) => w.name === warehouse);
    if (!wh) return [];
    return storageLocations.filter((s) => s.warehouseId === wh.id && s.active).map((s) => s.name);
  }, [warehouses, storageLocations, warehouse]);

  const supervisors = users.filter((u) => u.role === "supervisor" && u.active);
  const auxiliares = users.filter((u) => u.role === "auxiliar" && u.active);

  const reset = () => {
    setName("");
    setWarehouse("");
    setLocation("");
    setSupervisorId("");
    setAssignees([]);
    setBlindAux(false);
    setBlindSup(false);
  };

  const submit = async () => {
    if (!name.trim() || !warehouse || !supervisorId) {
      toast.error("Faltan datos", { description: "Nombre, almacén y supervisor son obligatorios." });
      return;
    }
    const audit = await createAudit({
      name: name.trim(),
      warehouse,
      location: location.trim(),
      supervisorId,
      assignedTo: assignees,
      lines: [],
      categories: [],
      blindForAuxiliar: blindAux,
      blindForSupervisor: blindSup,
      productIds: [],
    });
    toast.success("Auditoría creada", { description: "Agrega los ítems a contar desde la pestaña Ítems." });
    reset();
    onOpenChange(false);
    navigate(`/audits/${audit.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva auditoría</DialogTitle>
          <DialogDescription>
            Define el alcance y asigna al equipo. Los productos a contar se agregan luego desde la pestaña <b>Ítems</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Conteo trimestral herramientas" />
            </div>
            <div className="space-y-1.5">
              <Label>Almacén</Label>
              <Select value={warehouse} onValueChange={(v) => { setWarehouse(v); setLocation(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseNames.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ubicación / Zona</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Pasillo A"
                list="audit-location-options"
              />
              <datalist id="audit-location-options">
                {locationOptions.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Supervisor responsable</Label>
              <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.warehouse ? `· ${s.warehouse}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Auxiliares asignados ({assignees.length})</Label>
            <MultiSelect
              options={auxiliares.map((a) => ({ value: a.id, label: a.name, hint: a.warehouse ?? "Sin almacén" }))}
              selected={assignees}
              onChange={setAssignees}
              placeholder="Selecciona auxiliares…"
              emptyText="Sin auxiliares"
            />
          </div>

          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium">Conteo a ciegas · Auxiliar</span>
                <span className="block text-xs text-muted-foreground">Ocultar stock del sistema al auxiliar</span>
              </span>
              <Switch checked={blindAux} onCheckedChange={setBlindAux} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium">Conteo a ciegas · Supervisor</span>
                <span className="block text-xs text-muted-foreground">Ocultar stock del sistema en la revisión</span>
              </span>
              <Switch checked={blindSup} onCheckedChange={setBlindSup} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Crear auditoría</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
