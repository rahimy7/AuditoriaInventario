import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useStore } from "@/data/store";
import type { ImportResult, ProductImportMode, ProductImportRow } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { downloadProductTemplate, parseProductsFile } from "@/lib/importExport";

export function ImportProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { products, bulkImportProducts } = useStore();
  const [mode, setMode] = useState<ProductImportMode>("products");
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setResult(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseProductsFile(file);
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
      if (parsed.length === 0) toast.error("El archivo no contiene filas");
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  };

  const validRows = rows.filter((r) => r.code.trim());

  const doImport = async () => {
    if (validRows.length === 0) {
      toast.error("No hay filas válidas para importar");
      return;
    }
    setBusy(true);
    try {
      const res = await bulkImportProducts(mode, validRows);
      setResult(res);
      toast.success(`Importación completada: ${res.created} creados, ${res.updated} actualizados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>Descarga la plantilla, complétala y súbela para importar productos o actualizar stock.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* mode toggle */}
          <div className="inline-flex rounded-lg border p-0.5 text-sm">
            {(
              [
                ["products", "Crear / actualizar productos"],
                ["stock", "Actualizar stock"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  reset();
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {mode === "products"
              ? "Columnas: código, nombre, categoría, línea, unidad, stock, activo. Los códigos existentes se actualizan; los nuevos se crean."
              : "Columnas: código, stock. Actualiza el stock de sistema de productos existentes (por código). La plantilla viene pre-llenada con tus productos."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => downloadProductTemplate(mode, products)}>
              <Download className="h-4 w-4" /> Descargar plantilla
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Seleccionar archivo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {fileName && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                · {validRows.length} fila(s) válida(s)
                {rows.length !== validRows.length ? ` · ${rows.length - validRows.length} sin código` : ""}
              </span>
            </div>
          )}

          {/* preview */}
          {validRows.length > 0 && !result && (
            <div className="max-h-52 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Código</th>
                    {mode === "products" && <th className="px-2 py-1.5 font-medium">Nombre</th>}
                    {mode === "products" && <th className="px-2 py-1.5 font-medium">Categoría</th>}
                    <th className="px-2 py-1.5 text-right font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {validRows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 font-mono">{r.code}</td>
                      {mode === "products" && <td className="px-2 py-1">{r.name ?? ""}</td>}
                      {mode === "products" && <td className="px-2 py-1 text-muted-foreground">{r.category ?? ""}</td>}
                      <td className="px-2 py-1 text-right">{r.systemStock ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* result */}
          {result && (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <div className="flex gap-4">
                <span className="font-semibold text-emerald-600">{result.created} creados</span>
                <span className="font-semibold text-blue-600">{result.updated} actualizados</span>
                {result.errors.length > 0 && (
                  <span className="font-semibold text-destructive">{result.errors.length} con error</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-auto rounded border bg-muted/30 p-2 text-xs">
                  {result.errors.map((e, i) => (
                    <div key={i}>
                      Fila {e.row} {e.code ? `(${e.code})` : ""}: {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Cerrar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={doImport} disabled={busy || validRows.length === 0} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {validRows.length > 0 ? `(${validRows.length})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
