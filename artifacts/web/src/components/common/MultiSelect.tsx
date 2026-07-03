import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

/** Searchable multi-select (checkbox list in a popover) for picking from long lists. */
export function MultiSelect({ options, selected, onChange, placeholder = "Selecciona…", emptyText = "Sin resultados" }: Props) {
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

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options),
    [options, q],
  );

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className="flex flex-1 flex-wrap gap-1 text-left">
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((label, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {label}
                <X
                  className="h-3 w-3 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(options.find((o) => o.label === label)?.value ?? "");
                  }}
                />
              </span>
            ))
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
              placeholder="Buscar…"
              className="h-8 pl-7"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint ? <span className="block truncate text-xs text-muted-foreground">{o.hint}</span> : null}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
