import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { normalizeUnitCode, type UnitDef } from "@/data/units";

interface UnitComboboxProps {
  value: string;
  units: UnitDef[];
  onChange: (code: string) => void;
  /** Register a new unit that is not yet in the catalog. */
  onCreate: (code: string) => void;
}

/**
 * Unit picker for the product form: search the common-units catalog and pick one,
 * or create a new unit inline when the typed code doesn't exist yet.
 */
export function UnitCombobox({ value, units, onChange, onCreate }: UnitComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = normalizeUnitCode(query);
  const selected = units.find((u) => normalizeUnitCode(u.code) === normalizeUnitCode(value));

  const filtered = useMemo(
    () => (q ? units.filter((u) => u.code.toUpperCase().includes(q) || u.label.toUpperCase().includes(q)) : units),
    [units, q],
  );
  const exists = units.some((u) => normalizeUnitCode(u.code) === q);

  const pick = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  const create = () => {
    if (!q || exists) return;
    onCreate(q);
    pick(q);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={cn(!selected && !value && "text-muted-foreground")}>
          {selected ? (
            <>
              <span className="font-mono">{selected.code}</span>
              <span className="text-muted-foreground"> · {selected.label}</span>
            </>
          ) : (
            value || "Selecciona unidad"
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="relative border-b p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) pick(filtered[0].code);
                  else create();
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Buscar o crear unidad…"
              className="h-8 pl-7"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.map((u) => (
              <button
                key={u.code}
                type="button"
                onClick={() => pick(u.code)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="w-14 shrink-0 font-mono">{u.code}</span>
                <span className="flex-1 truncate text-muted-foreground">{u.label}</span>
                {normalizeUnitCode(u.code) === normalizeUnitCode(value) && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}

            {q && !exists && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary outline-none hover:bg-accent"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Crear unidad «{q}»
              </button>
            )}

            {filtered.length === 0 && !q && (
              <div className="py-6 text-center text-sm text-muted-foreground">Sin unidades</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
