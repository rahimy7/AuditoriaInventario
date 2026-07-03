import * as XLSX from "xlsx";
import type { Product, ProductImportMode, ProductImportRow } from "@/data/types";

// Normalize a header cell: lowercase, strip accents/spaces so "Código" == "codigo".
function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, "")
    .trim();
}

const HEADER_MAP: Record<string, keyof ProductImportRow> = {
  codigo: "code",
  clave: "code",
  sku: "code",
  nombre: "name",
  descripcion: "name",
  categoria: "category",
  linea: "line",
  unidad: "unit",
  um: "unit",
  stock: "systemStock",
  existencia: "systemStock",
  existencias: "systemStock",
  stocksistema: "systemStock",
  activo: "active",
};

function parseActive(v: unknown): boolean {
  const s = norm(String(v));
  return s === "si" || s === "si/no" || s === "true" || s === "1" || s === "x" || s === "activo";
}

/** Parse an .xlsx/.csv file into normalized import rows. */
export async function parseProductsFile(file: File): Promise<ProductImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return raw.map((r) => {
    const out: ProductImportRow = { code: "" };
    for (const [key, value] of Object.entries(r)) {
      const field = HEADER_MAP[norm(key)];
      if (!field) continue;
      if (field === "systemStock") out.systemStock = Number(value) || 0;
      else if (field === "active") out.active = parseActive(value);
      else out[field] = String(value).trim();
    }
    return out;
  });
}

/** Download an .xlsx template for the given import mode. Stock mode pre-fills current products. */
export function downloadProductTemplate(mode: ProductImportMode, products: Product[]): void {
  let rows: Record<string, string | number>[];
  if (mode === "stock") {
    rows = products
      .filter((p) => p.active)
      .map((p) => ({ codigo: p.code, nombre: p.name, stock: p.systemStock }));
    if (rows.length === 0) rows = [{ codigo: "", nombre: "", stock: 0 }];
  } else {
    rows = [
      {
        codigo: "EJ-001",
        nombre: "Producto de ejemplo",
        categoria: "Categoría",
        linea: "Línea",
        unidad: "PZA",
        stock: 0,
        activo: "Sí",
      },
    ];
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, mode === "stock" ? "Stock" : "Productos");
  XLSX.writeFile(wb, mode === "stock" ? "plantilla-stock.xlsx" : "plantilla-productos.xlsx");
}
