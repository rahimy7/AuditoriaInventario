import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/data/store";
import type { Audit, Product } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/common/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__none__";
type Mode = "manual" | "criteria" | "codes";

export function AddProductsDialog({
  audit,
  open,
  onOpenChange,
}: {
  audit: Audit;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { products, countItems, users, warehouses, storageLocations, addCountItems } = useStore();
  const [mode, setMode] = useState<Mode>("manual");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pickCats, setPickCats] = useState<string[]>([]);
  const [pickLines, setPickLines] = useState<string[]>([]);
  const [codesText, setCodesText] = useState("");
  const [location, setLocation] = useState(audit.location);
  const [assignedTo, setAssignedTo] = useState<string>(audit.assignedTo[0] ?? UNASSIGNED);

  const existing = useMemo(
    () => new Set(countItems.filter((i) => i.auditId === audit.id).map((i) => i.productId)),
    [countItems, audit.id],
  );
  const available = useMemo(() => products.filter((p) => p.active && !existing.has(p.id)), [products, existing]);
  const assignees = users.filter((u) => audit.assignedTo.includes(u.id));

  const categories = useMemo(() => Array.from(new Set(available.map((p) => p.category).filter(Boolean))).sort(), [available]);
  const lines = useMemo(() => Array.from(new Set(available.map((p) => p.line).filter(Boolean))).sort(), [available]);

  const locationOptions = useMemo(() => {
    const wh = warehouses.find((w) => w.name === audit.warehouse);
    if (!wh) return [];
    return storageLocations.filter((s) => s.warehouseId === wh.id && s.active).map((s) => s.name);
  }, [warehouses, storageLocations, audit.warehouse]);

  const manualList = useMemo(
    () =>
      available.filter(
        (p) => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()) || p.code.toLowerCase().includes(query.toLowerCase()),
      ),
    [available, query],
  );

  const criteriaMatches = useMemo(() => {
    if (pickCats.length === 0 && pickLines.length === 0) return [];
    return available.filter(
      (p) =>
        (pickCats.length === 0 || pickCats.includes(p.category)) && (pickLines.length === 0 || pickLines.includes(p.line)),
    );
  }, [available, pickCats, pickLines]);

  const codeResolution = useMemo(() => {
    const tokens = codesText
      .split(/[\n,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const byCode = new Map(available.map((p) => [p.code.toUpperCase(), p] as const));
    const matched: Product[] = [];
    const notFound: string[] = [];
    const seen = new Set<string>();
    for (const t of tokens) {
      const p = byCode.get(t.toUpperCase());
      if (p && !seen.has(p.id)) {
        matched.push(p);
        seen.add(p.id);
      } else if (!p) {
        notFound.push(t);
      }
    }
    return { matched, notFound };
  }, [available, codesText]);

  const resolvedIds = useMemo(() => {
    if (mode === "manual") return selected;
    if (mode === "criteria") return criteriaMatches.map((p) => p.id);
    return codeResolution.matched.map((p) => p.id);
  }, [mode, selected, criteriaMatches, codeResolution]);

  const reset = () => {
    setQuery("");
    setSelected([]);
    setPickCats([]);
    setPickLines([]);
    setCodesText("");
  };

  const submit = async () => {
    if (resolvedIds.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    await addCountItems(audit.id, resolvedIds, location, assignedTo === UNASSIGNED ? "" : assignedTo);
    toast.success(`${resolvedIds.length} producto(s) agregados`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar ítems al conteo</DialogTitle>
          <DialogDescription>Se crearán ítems de conteo pendientes para los productos elegidos.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Ubicación</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ubicación" list="additems-location-options" />
            <datalist id="additems-location-options">
              {locationOptions.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Asignar a</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                {assignees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* mode toggle */}
        <div className="inline-flex rounded-lg border p-0.5 text-sm">
          {(
            [
              ["manual", "Manual"],
              ["criteria", "Por categoría/línea"],
              ["codes", "Por códigos"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1.5 font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "manual" && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto…" className="pl-9" />
            </div>
            <ScrollArea className="h-56 rounded-lg border">
              <div className="divide-y">
                {manualList.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={selected.includes(p.id)}
                      onCheckedChange={() =>
                        setSelected((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.code} · {p.category}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.systemStock} {p.unit}
                    </span>
                  </label>
                ))}
                {manualList.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Sin productos disponibles</div>}
              </div>
            </ScrollArea>
          </>
        )}

        {mode === "criteria" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Categorías</Label>
              <MultiSelect
                options={categories.map((c) => ({ value: c, label: c }))}
                selected={pickCats}
                onChange={setPickCats}
                placeholder="Todas las categorías"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Líneas</Label>
              <MultiSelect
                options={lines.map((l) => ({ value: l, label: l }))}
                selected={pickLines}
                onChange={setPickLines}
                placeholder="Todas las líneas"
              />
            </div>
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {pickCats.length === 0 && pickLines.length === 0
                ? "Selecciona al menos una categoría o línea."
                : `${criteriaMatches.length} producto(s) coinciden y se agregarán.`}
            </p>
          </div>
        )}

        {mode === "codes" && (
          <div className="space-y-2">
            <Label>Lista de códigos</Label>
            <Textarea
              value={codesText}
              onChange={(e) => setCodesText(e.target.value)}
              placeholder="Pega los códigos separados por línea, coma o espacio…"
              className="h-28 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-emerald-600">{codeResolution.matched.length} encontrados</span>
              {codeResolution.notFound.length > 0 && (
                <span className="text-destructive">
                  {codeResolution.notFound.length} no encontrados: {codeResolution.notFound.slice(0, 8).join(", ")}
                  {codeResolution.notFound.length > 8 ? "…" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={resolvedIds.length === 0}>
            Agregar ({resolvedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
