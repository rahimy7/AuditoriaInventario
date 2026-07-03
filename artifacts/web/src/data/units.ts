import { useCallback, useMemo, useState } from "react";

export interface UnitDef {
  /** Short code stored on the product (e.g. "PZA"). */
  code: string;
  /** Human-readable name shown in the picker (e.g. "Pieza"). */
  label: string;
}

/** Catálogo de unidades de producto más comunes en inventarios (ES). */
export const COMMON_UNITS: UnitDef[] = [
  { code: "PZA", label: "Pieza" },
  { code: "KG", label: "Kilogramo" },
  { code: "G", label: "Gramo" },
  { code: "L", label: "Litro" },
  { code: "ML", label: "Mililitro" },
  { code: "M", label: "Metro" },
  { code: "CM", label: "Centímetro" },
  { code: "M2", label: "Metro cuadrado" },
  { code: "M3", label: "Metro cúbico" },
  { code: "CAJA", label: "Caja" },
  { code: "PAQ", label: "Paquete" },
  { code: "BULTO", label: "Bulto" },
  { code: "SACO", label: "Saco" },
  { code: "ROLLO", label: "Rollo" },
  { code: "PAR", label: "Par" },
  { code: "DOC", label: "Docena" },
  { code: "JGO", label: "Juego" },
  { code: "GAL", label: "Galón" },
  { code: "TON", label: "Tonelada" },
  { code: "LATA", label: "Lata" },
];

const CUSTOM_UNITS_KEY = "ic_web_custom_units";

function loadCustomUnits(): UnitDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_UNITS_KEY);
    if (raw) return JSON.parse(raw) as UnitDef[];
  } catch {
    /* ignore */
  }
  return [];
}

function persistCustomUnits(units: UnitDef[]) {
  try {
    localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(units));
  } catch {
    /* ignore */
  }
}

/** Normalize a code to the canonical uppercase form used across the catalog. */
export function normalizeUnitCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Builds the unit catalog shown in the product form. Merges, in priority order:
 * common units → units created by the user (persisted) → units already used by
 * existing products. Deduplicated case-insensitively by code. `addUnit` lets the
 * form register a brand-new unit so it stays available on future products.
 */
export function useUnitCatalog(usedCodes: string[]) {
  const [custom, setCustom] = useState<UnitDef[]>(() => loadCustomUnits());

  const addUnit = useCallback((code: string, label?: string): UnitDef | null => {
    const c = normalizeUnitCode(code);
    if (!c) return null;
    const known = COMMON_UNITS.some((u) => normalizeUnitCode(u.code) === c);
    const unit: UnitDef = { code: c, label: label?.trim() || c };
    if (!known) {
      setCustom((prev) => {
        if (prev.some((u) => normalizeUnitCode(u.code) === c)) return prev;
        const next = [...prev, unit];
        persistCustomUnits(next);
        return next;
      });
    }
    return unit;
  }, []);

  const units = useMemo(() => {
    const byCode = new Map<string, UnitDef>();
    const add = (u: UnitDef) => {
      const key = normalizeUnitCode(u.code);
      if (key && !byCode.has(key)) byCode.set(key, u);
    };
    COMMON_UNITS.forEach(add);
    custom.forEach(add);
    usedCodes.forEach((c) => {
      const t = c.trim();
      if (t) add({ code: t, label: t });
    });
    return Array.from(byCode.values());
  }, [custom, usedCodes]);

  return { units, addUnit };
}
